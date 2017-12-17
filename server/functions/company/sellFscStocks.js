import { createOrder } from '/server/imports/createOrder';
import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbCompanies } from '/db/dbCompanies';
import { dbDirectors } from '/db/dbDirectors';

// 金管會掛單賣出持股
export function sellFscStocks() {
  dbDirectors
    .find({ userId: '!FSC' })
    .forEach(({ companyId, stocks }) => {
      resourceManager.request('sellFSCStocks', [`companyOrder${companyId}`], (release) => {
        const companyData = dbCompanies.findOne({
          _id: companyId,
          isSeal: false
        }, {
          fields: {
            _id: 1,
            listPrice: 1,
            isSeal: 1
          }
        });

        if (! companyData) {
          release();

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

        release();
      });
    });
}
