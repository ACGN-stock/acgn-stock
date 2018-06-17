import { Meteor } from 'meteor/meteor';

import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbArena } from '/db/dbArena';
import { dbEventSchedules } from '/db/dbEventSchedules';
import { dbSeason } from '/db/dbSeason';
import { dbVariables } from '/db/dbVariables';

defineMigration({
  version: 23,
  name: 'event scheduling system',
  up() {
    const { intervalTimer } = Meteor.settings.public;

    // 將 counter 處理的週期性事件轉換為排程事件
    const counterToEventMap = {
      checkChairmanCounter: 'company.checkChairman',
      recordListPriceCounter: 'company.recordListPrice',
      releaseStocksForHighPriceCounter: 'company.releaseStocksForHighPrice',
      releaseStocksForNoDealCounter: 'company.releaseStocksForNoDeal'
    };

    Object.entries(counterToEventMap).forEach(([counterId, eventId]) => {
      const counterValue = dbVariables.get(counterId);
      if (counterValue) {
        dbVariables.remove(counterId);
        dbEventSchedules.upsert(eventId, { $set: { scheduledAt: new Date(Date.now() + counterValue * intervalTimer) } });
      }
    });

    // 將經理人選舉由 season 的 electTime 轉換為排程事件
    const currentSeason = dbSeason.findOne({}, { sort: { beginDate: -1 } });
    if (currentSeason && currentSeason.electTime) {
      dbEventSchedules.upsert('season.electManager', { $set: { scheduledAt: currentSeason.electTime } });
    }
    dbSeason.update({}, { $unset: { electTime: 1 } }, { multi: true });

    // 亂鬥的報名封關事件
    const currentArena = dbArena.findOne({}, { sort: { beginDate: -1 } });
    if (currentArena) {
      dbEventSchedules.upsert('arena.joinEnded', { $set: { scheduledAt: currentArena.joinEndDate } });
    }
  }
});
