import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbProducts } from '/db/dbProducts';
import { limitSubscription } from '/server/imports/rateLimit';
import { debug } from '/server/imports/debug';
import { publishTotalCount } from '/server/imports/publishTotalCount';

Meteor.publish('productListBySeasonId', function({seasonId, sortBy, sortDir, offset}) {
  debug.log('publish productListBySeasonId', {seasonId, sortBy, sortDir, offset});
  check(seasonId, String);
  check(sortBy, new Match.OneOf('votes', 'type', 'companyName'));
  check(sortDir, new Match.OneOf(1, -1));
  check(offset, Match.Integer);

  const filter = {
    seasonId: seasonId,
    overdue: {
      $gt: 0
    }
  };

  const totalCountObserver = publishTotalCount('totalCountOfProductList', dbProducts.find(filter), this);

  const pageObserver = dbProducts
    .find(filter, {
      fields: {
        productName: 0,
        url: 0
      },
      sort: { [sortBy]: sortDir },
      skip: offset,
      limit: 30,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('products', id, fields);
      },
      changed: (id, fields) => {
        this.changed('products', id, fields);
      },
      removed: (id) => {
        this.removed('products', id);
      }
    });

  this.ready();
  this.onStop(() => {
    totalCountObserver.stop();
    pageObserver.stop();
  });
});
//一分鐘最多重複訂閱10次
limitSubscription('allAdvertising', 10);
