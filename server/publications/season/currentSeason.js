import { Meteor } from 'meteor/meteor';

import { dbSeason } from '/db/dbSeason';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('currentSeason', function() {
  debug.log('publish currentSeason');
  const observer1 = dbSeason
    .find({}, {
      sort: { beginDate: -1 },
      limit: 1,
      disableOplog: true
    })
    .observeChanges({
      added: (id) => {
        this.added('variables', 'currentSeasonId', {
          value: id
        });
      },
      removed: () => {
        this.removed('variables', 'currentSeasonId');
      }
    });
  const observer2 = dbSeason
    .find({}, {
      sort: { beginDate: -1 },
      limit: 2,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('season', id, fields);
      },
      removed: (id) => {
        this.removed('season', id);
      }
    });

  this.onStop(() => {
    observer1.stop();
    observer2.stop();
  });
  this.ready();
});
// 一分鐘最多重複訂閱5次
limitSubscription('currentSeason', 5);
