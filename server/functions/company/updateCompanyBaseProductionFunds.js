import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { dbCompanies } from '/db/dbCompanies';

// 更新公司的基礎生產資金
export function updateCompanyBaseProductionFunds() {
  const companyUpdateModifierMap = {};

  dbCompanies.find({ isSeal: false })
    .forEach(({ _id: companyId, profit }) => {
      const baseProductionFund = Math.round(profit * 0.1);
      companyUpdateModifierMap[companyId] = { $set: { baseProductionFund } };
    });

  // TODO 設計工具合併重複程式碼
  if (! _.isEmpty(companyUpdateModifierMap)) {
    const companyBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
    Object.entries(companyUpdateModifierMap).forEach(([companyId, modifier]) => {
      companyBulk.find({ _id: companyId }).updateOne(modifier);
    });
    Meteor.wrapAsync(companyBulk.execute, companyBulk)();
  }
}
