import { Meteor } from 'meteor/meteor';

import { recordOneCompanyListPrice } from '/server/functions/company/recordListPrice';
import { createOrder } from '/server/imports/createOrder';
import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbCompanies, getPriceLimits } from '/db/dbCompanies';
import { dbOrders } from '/db/dbOrders';
import { dbVariables } from '/db/dbVariables';

// 記錄高價釋股時間
export function updateReleaseStocksForHighPricePeriod() {
  const { min: intervalMin, max: intervalMax } = Meteor.settings.public.releaseStocksForHighPriceInterval;
  const now = Date.now();

  dbVariables.set('releaseStocksForHighPriceBegin', now + intervalMin);
  dbVariables.set('releaseStocksForHighPriceEnd', now + intervalMax);
}

// 對全市場進行高價釋股
export function releaseStocksForHighPrice() {
  const highPriceThreshold = dbVariables.get('highPriceThreshold');

  dbCompanies
    .find({
      isSeal: false,
      lastPrice: { $gte: highPriceThreshold }
    }, {
      sort: { lastPrice: -1 },
      fields: { _id: 1 },
      disableOplog: true
    })
    .forEach(({ _id: companyId }) => {
      // 先鎖定資源，再重新讀取一次資料進行運算
      resourceManager.request('releaseStocksForHighPrice', [`companyOrder${companyId}`], (release) => {
        const companyData = dbCompanies.findOne(companyId, {
          fields: {
            _id: 1,
            listPrice: 1,
            totalRelease: 1,
            capital: 1,
            totalValue: 1,
            createdAt: 1
          }
        });

        const { totalRelease } = companyData;

        // 有尚存在的任何釋股單在市場上時不會繼續釋股
        if (dbOrders.find({ companyId, userId: '!system' }).count() > 0) {
          release();

          return;
        }

        const releasePrice = getPriceLimits(companyData).upper;
        const maxReleaseStocks = Math.floor(Math.sqrt(totalRelease));
        const releaseStocks = 1 + Math.floor(Math.random() * maxReleaseStocks);

        createOrder({
          userId: '!system',
          companyId: companyId,
          orderType: '賣出',
          unitPrice: releasePrice,
          amount: releaseStocks
        });
        recordOneCompanyListPrice(companyId);
        release();
      });
    });
}
