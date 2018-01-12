import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { dbProducts } from '/db/dbProducts';
import { getCurrentSeason } from '/db/dbSeason';

// 對全股市公司進行產品輪替
export function rotateProducts() {
  // 將所有在市場上的產品標為過季
  dbProducts.update({ state: 'marketing' }, { $set: { state: 'ended' } }, { multi: true });

  // 將所有待上市的產品上市，並設定庫存數量
  const { _id: seasonId } = getCurrentSeason();

  const productUpdateModifierMap = {};

  dbProducts.find({ state: 'planning' }).forEach(({ _id: productId, totalAmount }) => {
    productUpdateModifierMap[productId] = {
      $set: {
        state: 'marketing',
        seasonId,
        stockAmount: totalAmount
      }
    };
  });

  if (! _.isEmpty(productUpdateModifierMap)) {
    const productBulk = dbProducts.rawCollection().initializeUnorderedBulkOp();
    Object.entries(productUpdateModifierMap).forEach(([productId, modifier]) => {
      productBulk.find({ _id: productId }).updateOne(modifier);
    });
    Meteor.wrapAsync(productBulk.execute).call(productBulk);
  }
}
