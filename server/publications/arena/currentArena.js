import { Meteor } from 'meteor/meteor';

import { dbArena } from '/db/dbArena';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('currentArena', function() {
  debug.log('publish currentArena');
  const observer1 = dbArena
    .find({}, {
      sort: {
        beginDate: -1
      },
      limit: 1,
      disableOplog: true
    })
    .observeChanges({
      added: (id) => {
        this.added('variables', 'currentArenaId', {
          value: id
        });
      },
      removed: () => {
        this.removed('variables', 'currentArenaId');
      }
    });
  const observer2 = dbArena
    .find({}, {
      sort: {
        beginDate: -1
      },
      limit: 2,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('arena', id, fields);
      },
      changed: (id, fields) => {
        this.changed('arena', id, fields);
      },
      removed: (id) => {
        this.removed('arena', id);
      }
    });

  this.onStop(() => {
    observer1.stop();
    observer2.stop();
  });
  this.ready();
});
// 一分鐘最多重複訂閱5次
limitSubscription('currentArena', 5);
