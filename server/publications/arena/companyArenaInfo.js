import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbArena } from '/db/dbArena';
import { dbArenaFighters } from '/db/dbArenaFighters';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('companyArenaInfo', function(companyId) {
  debug.log('publish companyArenaInfo', companyId);
  check(companyId, String);

  const userId = this.userId;
  const arenaFightersObserverHash = {};
  const arenaObserver = dbArena
    .find({}, {
      disableOplog: true,
      sort: {
        beginDate: -1
      },
      limit: 1
    })
    .observeChanges({
      added: (arenaId, fields) => {
        this.added('arena', arenaId, fields);
        if (arenaFightersObserverHash[arenaId]) {
          arenaFightersObserverHash[arenaId].stop();
        }
        arenaFightersObserverHash[arenaId] = dbArenaFighters
          .find({ arenaId, companyId }, {
            fields: {
              investors: 0
            }
          })
          .observeChanges({
            added: (id, fields) => {
              if (userId === fields.manager) {
                this.added('arenaFighters', id, fields);
              }
              else {
                const publishFields = _.omit(fields, 'attackSequence', 'spCost');
                this.added('arenaFighters', id, publishFields);
              }
            },
            changed: (id, fields) => {
              const publishFields = _.omit(fields, 'attackSequence', 'spCost');
              if (_.size(publishFields) > 0) {
                this.changed('arenaFighters', id, publishFields);
              }
            }
          });
      },
      changed: (id, fields) => {
        this.changed('arena', id, fields);
      },
      removed: (id) => {
        this.removed('arena', id);
        if (arenaFightersObserverHash[id]) {
          arenaFightersObserverHash[id].stop();
          arenaFightersObserverHash[id] = undefined;
        }
      }
    });

  this.ready();
  this.onStop(() => {
    arenaObserver.stop();
    _.each(arenaFightersObserverHash, (observer) => {
      if (observer) {
        observer.stop();
      }
    });
  });
});
// 一分鐘最多20次
limitSubscription('companyArenaInfo');
