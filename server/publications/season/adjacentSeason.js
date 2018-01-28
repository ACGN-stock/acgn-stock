import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbSeason } from '/db/dbSeason';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('adjacentSeason', function(seasonId) {
  debug.log('publish adjacentSeason', seasonId);
  check(seasonId, String);

  const specificSeasonData = dbSeason.findOne(seasonId);
  if (specificSeasonData) {
    this.added('season', specificSeasonData._id, specificSeasonData);
    const specificSeasonDataBeginDate = specificSeasonData.beginDate;
    const observer1 = dbSeason
      .find({ beginDate: { $gt: specificSeasonDataBeginDate } }, {
        sort: { beginDate: 1 },
        limit: 1,
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
    const observer2 = dbSeason
      .find({ beginDate: { $lt: specificSeasonDataBeginDate } }, {
        sort: { beginDate: -1 },
        limit: 1,
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
  }
  this.ready();
});
// 一分鐘最多重複訂閱20次
limitSubscription('adjacentSeason');
