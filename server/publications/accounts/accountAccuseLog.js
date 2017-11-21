import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbLog, accuseLogTypeList } from '/db/dbLog';
import { limitSubscription } from '/server/imports/rateLimit';
import { debug } from '/server/imports/debug';
import { publishTotalCount } from '/server/imports/publishTotalCount';

Meteor.publish('accountAccuseLog', function(userId, offset) {
  debug.log('publish accountAccuseLog', {userId, offset});
  check(userId, String);
  check(offset, Match.Integer);

  const filter = {
    userId,
    logType: { $in: accuseLogTypeList }
  };

  const totalCountObserver = publishTotalCount('totalCountOfAccountAccuseLog', dbLog.find(filter), this);

  const pageObserver = dbLog
    .find(filter, {
      sort: { createdAt: -1 },
      skip: offset,
      limit: 10,
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

  if (this.userId === userId) {
    Meteor.users.update({
      _id: userId
    }, {
      $set: { 'profile.lastReadAccuseLogDate': new Date() }
    });
  }

  this.ready();
  this.onStop(() => {
    totalCountObserver.stop();
    pageObserver.stop();
  });
});
//一分鐘最多20次
limitSubscription('accountInfoLog');
