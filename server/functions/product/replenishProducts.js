import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import PD from 'probability-distributions';

import { dbProducts } from '/db/dbProducts';

// 對全部上市產品進行補貨
export function replenishProducts({ finalSale } = { finalSale: false }) {
  const productUpdateModifierMap = {};

  dbProducts.find({ state: 'marketing', stockAmount: { $gt: 0 } }).forEach(({ _id: productId, stockAmount }) => {
    // 以 Beta(alpha=3, beta=7) 分佈的亂數計算上架的數量
    const [sample] = PD.rbeta(1, 3, 7);
    const replenishAmount = finalSale ? stockAmount : Math.max(1, Math.ceil(stockAmount * sample * 0.1));

    productUpdateModifierMap[productId] = {
      $inc: {
        availableAmount: replenishAmount,
        stockAmount: -replenishAmount
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
