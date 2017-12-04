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
        arenaFightersObserverHash[arenaId] = dbArenaFighters.find({arenaId, companyId}).observeChanges({
          added: (id, fields) => {
            this.added('arenaFighters', id, fields);
          },
          changed: (id, fields) => {
            this.changed('arenaFighters', id, fields);
          },
          removed: (id) => {
            this.removed('arenaFighters', id);
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
//一分鐘最多20次
limitSubscription('companyArenaInfo');

