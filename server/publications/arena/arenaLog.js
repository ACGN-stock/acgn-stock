import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbArenaLog } from '/db/dbArenaLog';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { Counts } from 'meteor/tmeasday:publish-counts';
import { dbArena } from '/db/dbArena';
import { dbArenaFighters } from '/db/dbArenaFighters';
import { publishWithScope } from '/server/imports/utils/publishWithScope';

Meteor.publish('arenaLog', function({ arenaId, companyId, offset }) {
  debug.log('publish arenaLog', { arenaId, companyId, offset });

  check(arenaId, String);
  check(companyId, String);
  check(offset, Match.Integer);

  const arena = dbArena.findOne(arenaId, { fields: { endDate: 1 } });

  // 大賽未結束前不開放檢視紀錄
  if (! arena || arena.endDate.getTime() >= Date.now()) {
    return [];
  }

  const filter = {};
  if (companyId) {
    filter.companyId = companyId;
  }

  Counts.publish(this, 'arenaLog', dbArenaLog.find(arenaId, filter), { noReady: true });

  // 解讀 log 時所需的參賽者資訊
  publishWithScope(this, {
    collection: 'arenaFighters',
    scope: 'log',
    cursor: dbArenaFighters.find({ arenaId }, {
      fields: {
        arenaId: 1,
        companyId: 1,
        spCost: 1,
        normalManner: 1,
        specialManner: 1
      }
    })
  });

  return dbArenaLog.find(arenaId, filter, {
    sort: { sequence: 1 },
    skip: offset,
    limit: Meteor.settings.public.dataNumberPerPage.arenaLog,
    disableOplog: true
  });
});
// 一分鐘最多20次
limitSubscription('arenaLog');
