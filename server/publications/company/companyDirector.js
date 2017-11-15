import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbDirectors } from '/db/dbDirectors';
import { limitSubscription } from '/server/imports/rateLimit';
import { publishTotalCount } from '/server/imports/publishTotalCount';
import { debug } from '/server/imports/debug';

Meteor.publish('companyDirector', function(companyId, offset) {
  debug.log('publish companyDirector', {companyId, offset});
  check(companyId, String);
  check(offset, Match.Integer);

  const filter = { companyId };

  const totalCountObserver = publishTotalCount('totalCountOfCompanyDirector', dbDirectors.find(filter), this);

  const pageObserver = dbDirectors
    .find(filter, {
      sort: { stocks: -1 },
      skip: offset,
      limit: 10,
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
limitSubscription('companyDirector');
