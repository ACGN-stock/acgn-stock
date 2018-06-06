import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbLog } from '/db/dbLog';

defineMigration({
  version: 20,
  name: 'remove place/retrieve stone log',
  async up() {
    // 移除礦機的放石 / 取石 log
    await dbLog.rawCollection().remove({ logType: { $in: ['礦機放石', '礦機取石'] } });
  }
});
