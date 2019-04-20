import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbLog } from '/db/dbLog';
import { getCurrentRound } from '/db/dbRound';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';

Meteor.publish('companyLog', function(companyId, onlyShowMine, offset) {
  debug.log('publish companyLog', { companyId, onlyShowMine, offset });
  check(companyId, String);
  check(onlyShowMine, Boolean);
  check(offset, Match.Integer);

  const filter = { companyId, createdAt: { $gt: getCurrentRound().beginDate } };
  const userId = Meteor.userId();
  if (onlyShowMine && userId) {
    filter.userId = {
      $in: [userId, '!all']
    };
  }

  publishTotalCount('totalCountOfcompanyLog', dbLog.find(filter), this);

  const pageObserver = dbLog
    .find(filter, {
      sort: { createdAt: -1 },
      skip: offset,
      limit: 30,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('log', id, fields);
      },
      changed: (id, fields) => {
        this.changed('log', id, fields);
      },
      removed: (id) => {
        this.removed('log', id);
      }
    });

  this.ready();
  this.onStop(() => {
    pageObserver.stop();
  });
});
// 一分鐘最多20次
limitSubscription('companyLog');
