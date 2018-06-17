import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbCompanies } from '/db/dbCompanies';
import { dbVariables } from '/db/dbVariables';

export function updateRecordListPricePeriod() {
  const { min: intervalMin, max: intervalMax } = Meteor.settings.public.recordListPriceInterval;
  const now = Date.now();

  dbVariables.set('recordListPriceBegin', now + intervalMin);
  dbVariables.set('recordListPriceEnd', now + intervalMax);
}

// 更新參考價（與參考市值）
export function recordListPrice() {
  resourceManager.requestPromise('recordListPrice', ['allCompanyOrders'], (release) => {
    const companyUpdateModifierMap = dbCompanies
      .find({ isSeal: false }, { fields: { lastPrice: 1, totalRelease: 1 } })
      .fetch()
      .reduce((obj, { _id: companyId, lastPrice, totalRelease }) => {
        obj[companyId] = {
          $set: {
            listPrice: lastPrice,
            totalValue: lastPrice * totalRelease
          }
        };

        return obj;
      }, {});

    if (! _.isEmpty(companyUpdateModifierMap)) {
      const companyBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
      Object.entries(companyUpdateModifierMap).forEach(([companyId, modifier]) => {
        companyBulk.find({ _id: companyId }).updateOne(modifier);
      });
      Meteor.wrapAsync(companyBulk.execute, companyBulk)();
    }

    release();
  });
}
