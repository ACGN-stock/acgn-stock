import { Meteor } from 'meteor/meteor';

import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbArena } from '/db/dbArena';
import { dbArenaFighters } from '/db/dbArenaFighters';
import { getCurrentRound } from '/db/dbRound';
import { dbSeason, getCurrentSeason } from '/db/dbSeason';
import { dbVariables } from '/db/dbVariables';

defineMigration({
  version: 13,
  name: 'arena system',
  async up() {
    await Promise.all([
      dbArena.rawCollection().createIndex({ beginDate: 1 }),
      dbArenaFighters.rawCollection().createIndex({ arenaId: 1, companyId: 1 }, { unique: true })
    ]);

    // 在有資料的狀況下，用最後一個賽季與該賽季的商業季度總數推導出最近一次亂鬥的資料
    const currentRound = getCurrentRound();
    if (! currentRound) {
      return;
    }

    const seasonCount = dbSeason
      .find({
        beginDate: { $gte: currentRound.beginDate },
        endDate: { $lte: currentRound.endDate }
      }, {
        sort: { beginDate: -1 }
      })
      .count();
    if (seasonCount < 1) {
      return;
    }

    const { seasonTime, arenaIntervalSeasonNumber, electManagerTime } = Meteor.settings.public;

    const { beginDate, endDate } = getCurrentSeason();
    const arenaEndDate = new Date(endDate.getTime() + seasonTime * arenaIntervalSeasonNumber);
    dbArena.insert({
      beginDate: beginDate,
      endDate: arenaEndDate,
      joinEndDate: new Date(arenaEndDate.getTime() - electManagerTime),
      shuffledFighterCompanyIdList: []
    });

    dbVariables.set('arenaCounter', (arenaIntervalSeasonNumber + 1 - seasonCount) % (arenaIntervalSeasonNumber + 1));
  }
});
