import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { limitSubscription } from '/server/imports/rateLimit';
import { publishTotalCount } from '/server/imports/publishTotalCount';
import { dbDirectors } from '/db/dbDirectors';
import { debug } from '/server/imports/debug';

Meteor.publish('fscOwnStocks', function(userId, offset) {
  debug.log('publish fscOwnStocks', {userId, offset});
  check(userId, String);
  check(offset, Match.Integer);

  const filter = { userId };

  const totalCountObserver = publishTotalCount('totalCountOfFSCOwnStocks', dbDirectors.find(filter), this);

  const pageObserver = dbDirectors
    .find(filter, {
      fields: {
        userId: 1,
        companyId: 1,
        stocks: 1
      },
      skip: offset,
      limit: 20,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('directors', id, fields);
      },
      changed: (id, fields) => {
        this.changed('directors', id, fields);
      },
      removed: (id) => {
        this.removed('directors', id);
      }
    });

  this.ready();
  this.onStop(() => {
    totalCountObserver.stop();
    pageObserver.stop();
  });
});
//一分鐘最多20次
limitSubscription('fscOwnStocks');
