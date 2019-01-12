import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbArena } from '/db/dbArena';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('adjacentArena', function(arenaId) {
  debug.log('publish adjacentArena', arenaId);
  check(arenaId, String);

  const arena = dbArena.findOne(arenaId, { fields: { beginDate: 1 } });

  if (! arena) {
    return [];
  }

  const { beginDate } = arena;

  const observerCallbacks = {
    added: (id, fields) => {
      this.added('arena', id, fields);
    },
    removed: (id) => {
      this.removed('arena', id);
    }
  };

  const nextArenaObserver = dbArena.find({
    beginDate: { $gt: beginDate }
  }, {
    sort: { beginDate: 1 },
    fields: { _id: 1, beginDate: 1 },
    limit: 1,
    disableOplog: true
  }).observeChanges(observerCallbacks);

  const previousArenaObserver = dbArena.find({
    beginDate: { $lt: beginDate }
  }, {
    sort: { beginDate: -1 },
    fields: { _id: 1, beginDate: 1 },
    limit: 1,
    disableOplog: true
  }).observeChanges(observerCallbacks);

  this.onStop(() => {
    nextArenaObserver.stop();
    previousArenaObserver.stop();
  });

  this.ready();
});
// 一分鐘最多重複訂閱20次
limitSubscription('adjacentArena');
