import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';

Meteor.publish('accountChairmanTitle', function(userId, offset) {
  debug.log('publish accountChairmanTitle', {userId, offset});
  check(userId, String);
  check(offset, Match.Integer);

  const filter = {chairman: userId};

  publishTotalCount('totalCountOfChairmanTitle', dbCompanies.find(filter), this);

  const pageObserver = dbCompanies
    .find(filter, {
      skip: offset,
      limit: 10,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('companies', id, fields);
      },
      changed: (id, fields) => {
        this.changed('companies', id, fields);
      },
      removed: (id) => {
        this.removed('companies', id);
      }
    });

  this.ready();
  this.onStop(() => {
    pageObserver.stop();
  });
});
//一分鐘最多20次
limitSubscription('accountChairmanTitle');

Meteor.publish('accountManagerTitle', function(userId, offset) {
  debug.log('publish accountManagerTitle', {userId, offset});
  check(userId, String);
  check(offset, Match.Integer);

  const filter = {manager: userId};

  publishTotalCount('totalCountOfManagerTitle', dbCompanies.find(filter), this);

  const pageObserver = dbCompanies
    .find(filter, {
      skip: offset,
      limit: 10,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('companies', id, fields);
      },
      changed: (id, fields) => {
        this.changed('companies', id, fields);
      },
      removed: (id) => {
        this.removed('companies', id);
      }
    });

  this.ready();
  this.onStop(() => {
    pageObserver.stop();
  });
});
//一分鐘最多20次
limitSubscription('accountManagerTitle');
