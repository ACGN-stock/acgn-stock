import { Meteor } from 'meteor/meteor';

import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbLog } from '/db/dbLog';

defineMigration({
  version: 18,
  name: 'voucher system',
  async up() {
    await Promise.all([
      // 設定所有現有使用者的消費券為 0
      Meteor.users.rawCollection().update({}, { $set: { 'profile.vouchers': 0 } }, { multi: true }),

      // 購買產品紀錄的花費欄位擴增為現金與消費券兩個
      dbLog.rawCollection().update({ logType: '購買產品', cost: { $exists: true } }, {
        $rename: { 'data.cost': 'data.moneyCost' },
        $set: { 'data.voucherCost': 0 }
      })
    ]);
  }
});
