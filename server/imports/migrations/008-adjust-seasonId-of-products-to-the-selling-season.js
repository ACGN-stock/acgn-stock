import { _ } from 'meteor/underscore';

import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbProducts } from '/db/dbProducts';
import { dbSeason } from '/db/dbSeason';

defineMigration({
  version: 8,
  name: 'adjust seasonId of products to the selling season',
  up() {
    const seasonIdList = _.pluck(dbSeason.find({}, { sort: { beginDate: 1 }, fields: { _id: 1 } }).fetch(), '_id');

    // 將產品的 seasonId 欄位從資料建立時的季度調整為開始販賣的季度（下一個季度）
    seasonIdList.forEach((seasonId, index) => {
      const nextSeasonId = seasonIdList[index + 1];
      dbProducts.update(
        { seasonId },
        nextSeasonId ? { $set: { seasonId: nextSeasonId } } : { $unset: { seasonId: 0 } },
        { multi: true });
    });
  }
});
