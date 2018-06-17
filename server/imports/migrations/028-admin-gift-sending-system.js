import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbLog } from '/db/dbLog';

defineMigration({
  version: 28,
  name: 'admin gift sending system',
  async up() {
    // 將舊有的「免費得石」紀錄轉換成新的「營運送禮」格式
    await dbLog.rawCollection().update({ logType: '免費得石' }, {
      $rename: { 'data.stones': 'data.amount' },
      $set: {
        logType: '營運送禮',
        userId: ['!system', '!all'],
        'data.userType': 'all',
        'data.giftType': 'saintStone'
      }
    }, { multi: true });
  }
});
