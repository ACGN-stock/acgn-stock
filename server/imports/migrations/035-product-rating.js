import { defineMigration } from '/server/imports/utils/defineMigration';
import { executeBulksSync } from '/server/imports/utils/executeBulksSync';
import { dbProducts } from '/db/dbProducts';

defineMigration({
  version: 35,
  name: 'product rating',
  up() {
    const productBulk = dbProducts.rawCollection().initializeUnorderedBulkOp();
    productBulk
      .find({ type: { $nin: ['裏物', '未分類'] } })
      .update({ $set: { 'rating': '一般向' } });
    productBulk
      .find({ type: '裏物' })
      .update({
        $set: {
          'type': '未分類',
          'rating': '18禁'
        }
      });
    executeBulksSync(productBulk);
  }
});
