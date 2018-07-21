import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbTaxes } from '/db/dbTaxes';
import { dbLog } from '/db/dbLog';

defineMigration({
  version: 32,
  name: 'tax separate',
  async up() {
    // 將 tax 換為 stockTax,  zombie 改名為 zombieTax
    await dbTaxes.rawCollection().update({}, {
      $rename: { 'tax': 'stockTax', 'zombie': 'zombieTax' },
      $set: { 'moneyTax': 0 }
    }, { multi: true });

    await dbLog.rawCollection().update({ logType: '季度賦稅' }, {
      $rename: { 'data.assetTax': 'data.stockTax' },
      $set: { 'data.moneyTax': 0 }
    }, { multi: true });
  }
});
