import { Meteor } from 'meteor/meteor';

import { createOrder } from '/server/imports/createOrder';
import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbCompanies } from '/db/dbCompanies';
import { dbVariables } from '/db/dbVariables';
import { calculateHighPriceBuyAmount, getPriceLimits } from './helpers';

export function updateReleaseStocksForLowPricePeriod() {
  // TODO 移除 counter 設定，改用時間計算
  const { releaseStocksForLowPriceCounter, intervalTimer } = Meteor.settings.public;

  const jitter = 30;
  const now = Date.now();
  const begin = now + (releaseStocksForLowPriceCounter - jitter) * intervalTimer;
  const end = now + (releaseStocksForLowPriceCounter + jitter) * intervalTimer;

  dbVariables.set('releaseStocksForLowPriceBegin', begin);
  dbVariables.set('releaseStocksForLowPriceEnd', end);
}

// 對全市場進行低價釋股
export function releaseStocksForLowPrice() {
  const lowPriceThreshold = dbVariables.get('lowPriceThreshold');

  dbCompanies
    .find({
      isSeal: false,
      listPrice: { $lt: lowPriceThreshold }
    }, {
      fields: { _id: 1 },
      disableOplog: true
    })
    .forEach(({ _id: companyId }) => {
      //先鎖定資源，再重新讀取一次資料進行運算
      resourceManager.request('releaseStocksForLowPrice', [`companyOrder${companyId}`], (release) => {
        const companyData = dbCompanies.findOne(companyId, {
          fields: {
            listPrice: 1,
            totalRelease: 1
          }
        });

        const { totalRelease } = companyData;

        const highPriceBuyAmount = calculateHighPriceBuyAmount(companyData);
        const minReleaseAmount = Math.floor(totalRelease * 0.01);
        const maxReleaseAmount = Math.floor(totalRelease * 0.05);

        // 買單數量未超過最低釋股數 (1% 總股數)，則不進行釋股
        if (highPriceBuyAmount <= minReleaseAmount) {
          release();

          return;
        }

        const releasePrice = getPriceLimits(companyData).upper;
        const releaseStocks = Math.min(highPriceBuyAmount, maxReleaseAmount);

        createOrder({
          userId: '!system',
          companyId: companyId,
          orderType: '賣出',
          unitPrice: releasePrice,
          amount: releaseStocks
        });

        release();
      });
    });
}
