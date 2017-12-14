import { Meteor } from 'meteor/meteor';

import { createOrder } from '/server/imports/createOrder';
import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbCompanies } from '/db/dbCompanies';
import { dbVariables } from '/db/dbVariables';
import { calculateHighPriceBuyAmount, calculateDealAmount, getPriceLimits } from './helpers';

export function updateReleaseStocksForNoDealPeriod() {
  // TODO 移除 counter 設定，改用時間計算
  const { releaseStocksForNoDealMinCounter, releaseStocksForNoDealMaxCounter, intervalTimer } = Meteor.settings.public;

  const now = Date.now();
  const begin = now + releaseStocksForNoDealMinCounter * intervalTimer;
  const end = now + releaseStocksForNoDealMaxCounter * intervalTimer;

  dbVariables.set('releaseStocksForNoDealBegin', begin);
  dbVariables.set('releaseStocksForNoDealEnd', end);
}

// 對全市場進行低量釋股
export function releaseStocksForNoDeal() {
  dbCompanies
    .find({ isSeal: false }, {
      fields: { _id: 1 },
      disableOplog: true
    })
    .forEach(({ _id: companyId }) => {
      //先鎖定資源，再重新讀取一次資料進行運算
      resourceManager.request('releaseStocksForNoDeal', [`companyOrder${companyId}`], (release) => {
        const companyData = dbCompanies.findOne(companyId, { fields: { _id: 1, listPrice: 1 } });
        const dealAmount = calculateDealAmount(companyData, Meteor.settings.public.releaseStocksForNoDealTradeLogLookbackIntervalTime);
        const highPriceBuyAmount = calculateHighPriceBuyAmount(companyData);

        if (highPriceBuyAmount <= dealAmount * 10) {
          release();

          return;
        }

        const releasePrice = getPriceLimits(companyData).upper;
        const releaseStocks = 1 + Math.floor(Math.random() * highPriceBuyAmount / 2);

        createOrder({
          userId: '!system',
          companyId,
          orderType: '賣出',
          unitPrice: releasePrice,
          amount: releaseStocks
        });
        release();
      });
    });
}
