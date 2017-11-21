import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbFoundations } from '/db/dbFoundations';
import { limitSubscription } from '/server/imports/rateLimit';
import { debug } from '/server/imports/debug';
import { publishTotalCount } from '/server/imports/publishTotalCount';

Meteor.publish('foundationList', function(keyword, offset) {
  debug.log('publish foundationPlan', {keyword, offset});
  check(keyword, String);
  check(offset, Match.Integer);
  const filter = {};
  if (keyword) {
    keyword = keyword.replace(/\\/g, '\\\\');
    const reg = new RegExp(keyword, 'i');
    filter.$or = [
      {
        companyName: reg
      },
      {
        tags: reg
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
