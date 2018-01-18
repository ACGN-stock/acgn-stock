import { Meteor } from 'meteor/meteor';

import { dbRound } from '/db/dbRound';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('currentRound', function() {
  debug.log('publish currentRound');
  const observer1 = dbRound
    .find({}, {
      sort: {
        beginDate: -1
      },
      limit: 1,
      disableOplog: true
    })
    .observeChanges({
      added: (id) => {
        this.added('variables', 'currentRoundId', {
          value: id
        });
      },
      removed: () => {
        this.removed('variables', 'currentRoundId');
      }
    });
  const observer2 = dbRound
    .find({}, {
      sort: {
        beginDate: -1
      },
      fields: {
        beginDate: 1,
        endDate: 1
      },
      limit: 1,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('round', id, fields);
      },
      removed: (id) => {
        this.removed('round', id);
      }
    });

  this.onStop(() => {
    observer1.stop();
    observer2.stop();
  });
  this.ready();
});
// 一分鐘最多重複訂閱5次
limitSubscription('currentRound', 5);
