import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { dbCompanies } from '/db/dbCompanies';

// 重設公司的生產資金（與產品價格上限）
export function updateCompanyProductionFunds() {
  const companyUpdateModifierMap = {};

  dbCompanies.find({ isSeal: false })
    .forEach(({ _id: companyId, capital, profit, listPrice }) => {
      const productionFund = Math.round(capital * 0.7 + profit * 0.1);
      const productPriceLimit = listPrice;
      companyUpdateModifierMap[companyId] = { $set: { productionFund, productPriceLimit } };
    });

  // TODO 設計工具合併重複程式碼
  if (! _.isEmpty(companyUpdateModifierMap)) {
    const companyBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
    Object.entries(companyUpdateModifierMap).forEach(([companyId, modifier]) => {
      companyBulk.find({ _id: companyId }).updateOne(modifier);
    });
    Meteor.wrapAsync(companyBulk.execute).call(companyBulk);
  }
}
