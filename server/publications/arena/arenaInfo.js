import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbArena } from '/db/dbArena';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('arenaInfo', function(arenaId) {
  debug.log('publish arenaInfo', arenaId);
  check(arenaId, String);

  return dbArena.find(arenaId, { disableOplog: true });
});
// 一分鐘最多20次
limitSubscription('arenaInfo');
