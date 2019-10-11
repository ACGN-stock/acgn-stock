import { Meteor } from 'meteor/meteor';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbCompanies } from '/db/dbCompanies';
import { dbVariables } from '/db/dbVariables';
import { executeBulksSync } from '/server/imports/utils/executeBulksSync';

export function updateRecordListPricePeriod() {
  const { min: intervalMin, max: intervalMax } = Meteor.settings.public.recordListPriceInterval;
  const now = Date.now();

  dbVariables.set('recordListPriceBegin', now + intervalMin);
  dbVariables.set('recordListPriceEnd', now + intervalMax);
}

// 更新參考價（與參考市值）
export function recordListPrice() {
  resourceManager.requestPromise('recordListPrice', ['allCompanyOrders'], (release) => {
    const companyBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
    dbCompanies
      .find({ isSeal: false }, { fields: { lastPrice: 1, totalRelease: 1 } })
      .fetch()
      .forEach(({ _id: companyId, lastPrice, totalRelease }) => {
        companyBulk
          .find({ _id: companyId })
          .updateOne({ $set: {
            listPrice: lastPrice,
            totalValue: lastPrice * totalRelease
          } });
      });

    executeBulksSync(companyBulk);

    release();
  });
}
