'use strict';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbArena } from '/db/dbArena';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('adjacentArena', function(arenaId) {
  debug.log('publish adjacentArena', arenaId);
  check(arenaId, String);

  const specificArenaData = dbArena.findOne(arenaId);
  if (specificArenaData) {
    this.added('arena', specificArenaData._id, specificArenaData);
    const specificArenaDataBeginDate = specificArenaData.beginDate;
    const observer1 = dbArena
      .find(
        {
          beginDate: {
            $gt: specificArenaDataBeginDate
          }
        },
        {
          sort: {
            beginDate: 1
          },
          limit: 1,
          disableOplog: true
        }
      )
      .observeChanges({
        added: (id, fields) => {
          this.added('arena', id, fields);
        },
        removed: (id) => {
          this.removed('arena', id);
        }
      });
    const observer2 = dbArena
      .find(
        {
          beginDate: {
            $lt: specificArenaDataBeginDate
          }
        },
        {
          sort: {
            beginDate: -1
          },
          limit: 1,
          disableOplog: true
        }
      )
      .observeChanges({
        added: (id, fields) => {
          this.added('arena', id, fields);
        },
        removed: (id) => {
          this.removed('arena', id);
        }
      });
    this.onStop(() => {
      observer1.stop();
      observer2.stop();
    });
  }
  this.ready();
});
//一分鐘最多重複訂閱20次
limitSubscription('adjacentArena');
