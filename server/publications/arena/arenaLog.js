import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbArenaLog } from '/db/dbArenaLog';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';

Meteor.publish('arenaLog', function(arenaId, companyId, offset) {
  debug.log('publish arenaLog', { arenaId, companyId, offset });

  check(arenaId, String);
  check(companyId, String);
  check(offset, Match.Integer);

  const filter = {};
  if (companyId) {
    filter.companyId = companyId;
  }

  publishTotalCount('totalCountOfArenaLog', dbArenaLog.find(arenaId, filter), this);

  const collectionName = dbArenaLog.getCollectionName(arenaId);
  const pageObserver = dbArenaLog
    .find(arenaId, filter, {
      sort: {
        sequence: 1
      },
      skip: offset,
      limit: 30,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added(collectionName, id, fields);
      },
      changed: (id, fields) => {
        this.changed(collectionName, id, fields);
      },
      removed: (id) => {
        this.removed(collectionName, id);
      }
    });

  this.ready();
  this.onStop(() => {
    pageObserver.stop();
  });
});
// 一分鐘最多20次
limitSubscription('arenaLog');
