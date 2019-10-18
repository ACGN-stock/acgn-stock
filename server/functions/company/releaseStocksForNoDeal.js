import { Meteor } from 'meteor/meteor';

import { recordOneCompanyListPrice } from '/server/functions/company/recordListPrice';
import { createOrder } from '/server/imports/createOrder';
import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbCompanies, getPriceLimits } from '/db/dbCompanies';
import { dbVariables } from '/db/dbVariables';
import { calculateHighPriceBuyAmount, calculateDealAmount } from './helpers';

export function updateReleaseStocksForNoDealPeriod() {
  const { min: intervalMin, max: intervalMax } = Meteor.settings.public.releaseStocksForNoDealInterval;
  const now = Date.now();

  dbVariables.set('releaseStocksForNoDealBegin', now + intervalMin);
  dbVariables.set('releaseStocksForNoDealEnd', now + intervalMax);
}

// 對全市場進行低量釋股
export function releaseStocksForNoDeal() {
  dbCompanies
    .find({ isSeal: false }, {
      fields: { _id: 1, createdAt: 1, totalRelease: 1 },
      disableOplog: true
    })
    .forEach(({ _id: companyId, createdAt, totalRelease }) => {
      // 先鎖定資源，再重新讀取一次資料進行運算
      resourceManager.request('releaseStocksForNoDeal', [`companyOrder${companyId}`], (release) => {
        const { releaseStocksForNoDealTradeLogLookbackIntervalTime: lookbackTime } = Meteor.settings.public;

        const companyData = dbCompanies.findOne(companyId, {
          fields: {
            _id: 1,
            listPrice: 1,
            capital: 1,
            totalValue: 1,
            createdAt: 1
          }
        });
        const dealAmount = calculateDealAmount(companyData, lookbackTime);
        const highPriceBuyAmount = calculateHighPriceBuyAmount(companyData);

        // 判斷是否為最近上市的公司
        const isNewCompany = Date.now() - lookbackTime < createdAt.getTime();

        // 低量實際門檻
        const threshold = 10 * (dealAmount + (isNewCompany ? totalRelease : 0));

        if (highPriceBuyAmount <= threshold) {
          release();

          return;
        }

        const releasePrice = getPriceLimits(companyData).upper;
        const releaseStocks = 1 + Math.floor(Math.random() * Math.floor(highPriceBuyAmount / 2));

        createOrder({
          userId: '!system',
          companyId,
          orderType: '賣出',
          unitPrice: releasePrice,
          amount: releaseStocks
        });
        recordOneCompanyListPrice(companyId);
        release();
      });
    });
}
