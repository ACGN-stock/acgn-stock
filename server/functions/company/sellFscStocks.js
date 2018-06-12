import { createOrder } from '/server/imports/createOrder';
import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbCompanies } from '/db/dbCompanies';
import { dbDirectors } from '/db/dbDirectors';

// 金管會掛單賣出持股
export function sellFscStocks() {
  return resourceManager.requestPromise('sellFscStocks', ['allCompanyOrders'], (release) => {
    dbDirectors.find({ userId: '!FSC' })
      .forEach(({ companyId, stocks }) => {
        const companyData = dbCompanies.findOne({ _id: companyId, isSeal: false }, { fields: { listPrice: 1 } });

        if (! companyData) {
          return;
        }

        // 以參考價賣出十分之一（最少十股直到全賣光）的持股數
        const { listPrice } = companyData;
        const amount = stocks > 100 ? Math.ceil(stocks * 0.1) : Math.min(stocks, 10);

        createOrder({
          userId: '!FSC',
          companyId,
          orderType: '賣出',
          unitPrice: listPrice,
          amount
        });
      });
    release();
  });
}
