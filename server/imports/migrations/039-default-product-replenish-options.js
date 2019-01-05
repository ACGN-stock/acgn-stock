import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbProducts } from '/db/dbProducts';

defineMigration({
  version: 39,
  name: 'default product replenish options',
  up() {
    dbProducts.update({}, {
      $set: {
        replenishBaseAmountType: 'stockAmount',
        replenishBatchSizeType: 'verySmall'
      }
    }, { multi: true });
  }
});
