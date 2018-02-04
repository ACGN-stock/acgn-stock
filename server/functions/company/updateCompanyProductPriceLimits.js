import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { dbCompanies } from '/db/dbCompanies';

// 更新公司的產品價格上限
export function updateCompanyProductPriceLimits() {
  const companyUpdateModifierMap = {};

  dbCompanies.find({ isSeal: false })
    .forEach(({ _id: companyId, listPrice }) => {
      const productPriceLimit = listPrice;
      companyUpdateModifierMap[companyId] = { $set: { productPriceLimit } };
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
