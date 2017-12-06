import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { limitSubscription } from '/server/imports/utils/rateLimit';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';
import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('accountInfoLog', function(userId, offset) {
  debug.log('publish accountInfoLog', {userId, offset});
  check(userId, String);
  check(offset, Match.Integer);

  const firstLogData = dbLog.findOne({ userId }, { sort: { createdAt: 1 } });
  const firstLogDate = firstLogData ? firstLogData.createdAt : new Date();

  const filter = {
    userId: { $in: [userId, '!all'] },
    createdAt: { $gte: firstLogDate }
  };

  publishTotalCount('totalCountOfAccountInfoLog', dbLog.find(filter), this);

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
      removed: (id) => {
        this.removed('log', id);
      }
    });

  this.ready();
  this.onStop(() => {
    pageObserver.stop();
  });
});
//一分鐘最多20次
limitSubscription('accountInfoLog');
