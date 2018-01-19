import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbFoundations } from '/db/dbFoundations';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';
import { buildSearchRegExp } from '/server/imports/utils/buildSearchRegExp';

Meteor.publish('foundationList', function({ keyword, matchType, offset }) {
  debug.log('publish foundationPlan', { keyword, matchType, offset });
  check(keyword, String);
  check(matchType, new Match.OneOf('exact', 'fuzzy'));
  check(offset, Match.Integer);

  const filter = {};

  if (keyword) {
    const regexp = buildSearchRegExp(keyword, matchType);
    filter.$or = [
      {
        companyName: regexp
      },
      {
        tags: regexp
      }
    ];
  }

  publishTotalCount('totalCountOfFoundationPlan', dbFoundations.find(filter), this);

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
    pageObserver.stop();
  });
});
// 一分鐘最多20次
limitSubscription('foundationList');
