import { defineMigration } from '/server/imports/utils/defineMigration';
import { executeBulksSync } from '/server/imports/utils/executeBulksSync';
import { dbArenaFighters, arenaFighterAttributeNameList } from '/db/dbArenaFighters';
import { dbArena } from '/db/dbArena';

// 以能力值投入總額計算總投資額
function getTotalInvestedAmount(arenaFighter) {
  return arenaFighterAttributeNameList.reduce((sum, attrName) => {
    return sum + arenaFighter[attrName];
  }, 0);
}

defineMigration({
  version: 40,
  name: 'arena rewrite',
  async up() {
    // 為參賽列表排序需要而新增的 indexes
    await Promise.all([
      dbArenaFighters.rawCollection().createIndex({ arenaId: 1, hp: 1 }),
      dbArenaFighters.rawCollection().createIndex({ arenaId: 1, sp: 1 }),
      dbArenaFighters.rawCollection().createIndex({ arenaId: 1, atk: 1 }),
      dbArenaFighters.rawCollection().createIndex({ arenaId: 1, def: 1 }),
      dbArenaFighters.rawCollection().createIndex({ arenaId: 1, agi: 1, createdAt: 1 }), // 攻擊順序同 agi 時看上市時間
      dbArenaFighters.rawCollection().createIndex({ arenaId: 1, rank: 1 }),
      dbArenaFighters.rawCollection().createIndex({ arenaId: 1, totalInvestedAmount: -1 })
    ]);

    const arenaFightersBulk = dbArenaFighters.rawCollection().initializeUnorderedBulkOp();

    // 總投資額計算
    dbArenaFighters.find().forEach((arenaFighter) => {
      arenaFightersBulk
        .find({ _id: arenaFighter._id })
        .updateOne({ $set: { totalInvestedAmount: getTotalInvestedAmount(arenaFighter) } });
    });

    // 名次計算
    dbArena.find({ winnerList: { $exists: true } }, { fields: { winnerList: 1 } })
      .forEach(({ _id: arenaId, winnerList }) => {
        winnerList.forEach((companyId, index) => {
          const rank = index + 1;
          arenaFightersBulk.find({ arenaId, companyId }).updateOne({ $set: { rank } });
        });
      });

    executeBulksSync(arenaFightersBulk);

    // 移除 arena 內的勝利者順位欄位
    dbArena.update({}, { $unset: { winnerList: 0 } }, { multi: true });
  }
});
