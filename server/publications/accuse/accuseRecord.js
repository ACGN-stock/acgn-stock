import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbLog, accuseLogTypeList } from '/db/dbLog';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';

Meteor.publish('accuseRecord', function(offset) {
  debug.log('publish accuseRecord', offset);
  check(offset, Match.Integer);

  const filter = {
    logType: { $in: accuseLogTypeList }
  };

  publishTotalCount('totalCountOfAccuseRecord', dbLog.find(filter), this);

  const pageObserver = dbLog
    .find(filter, {
      sort: {
        createdAt: -1
      },
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
// 一分鐘最多重複訂閱10次
limitSubscription('accuseRecord', 10);
