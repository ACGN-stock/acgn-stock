import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbProducts } from '/db/dbProducts';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';

Meteor.publish('productListByCompany', function({ companyId, sortBy, sortDir, offset }) {
  debug.log('publish productListByCompany', { companyId, sortBy, sortDir, offset });
  check(companyId, String);
  check(sortBy, new Match.OneOf('voteCount', 'type', 'rating'));
  check(sortDir, new Match.OneOf(1, -1));
  check(offset, Match.Integer);

  const filter = { companyId, state: { $ne: 'planning' } };

  publishTotalCount('totalCountOfProductList', dbProducts.find(filter), this);

  const pageObserver = dbProducts
    .find(filter, {
      fields: {
        profit: 0,
        price: 0,
        stockAmount: 0,
        totalAmount: 0,
        availableAmount: 0
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
    pageObserver.stop();
  });
});
// 一分鐘最多20次
limitSubscription('productListByCompany');
