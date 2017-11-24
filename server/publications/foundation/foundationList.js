import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbFoundations } from '/db/dbFoundations';
import { limitSubscription } from '/server/imports/rateLimit';
import { debug } from '/server/imports/debug';
import { publishTotalCount } from '/server/imports/publishTotalCount';
import { buildSearchRegExp } from '/server/imports/buildSearchRegExp';

Meteor.publish('foundationList', function({keyword, matchType, offset}) {
  debug.log('publish foundationPlan', {keyword, matchType, offset});
  check(keyword, String);
  check(matchType, new Match.OneOf('exact', 'fuzzy'));
  check(offset, Match.Integer);

  const filter = {};

  if (keyword) {
    const regexp = buildSearchRegExp(keyword, matchType);
    filter.$or = [
      {
        name: regexp
      },
      {
        tags: regexp
      }
    ];
  }

  const totalCountObserver = publishTotalCount('totalCountOfFoundationPlan', dbFoundations.find(filter), this);

  const pageObserver = dbFoundations
    .find(filter, {
      sort: { createdAt: 1 },
      skip: offset,
      limit: 12,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('foundations', id, fields);
      },
      changed: (id, fields) => {
        this.changed('foundations', id, fields);
      },
      removed: (id) => {
        this.removed('foundations', id);
      }
    });

  this.ready();
  this.onStop(() => {
    totalCountObserver.stop();
    pageObserver.stop();
  });
});
//一分鐘最多20次
limitSubscription('foundationList');
