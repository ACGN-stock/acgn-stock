import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbProducts } from '/db/dbProducts';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';
import { hasRole } from '/db/users';

const ADMIN_ONLY_FIELDS = [
  'createdAt',
  'creator',
  'updatedAt',
  'updatedBy'
];

Meteor.publish('productListBySeasonId', function({ seasonId, sortBy, sortDir, offset }) {
  debug.log('publish productListBySeasonId', { seasonId, sortBy, sortDir, offset });
  check(seasonId, String);
  check(sortBy, new Match.OneOf('voteCount', 'type', 'rating', 'companyName'));
  check(sortDir, new Match.OneOf(1, -1));
  check(offset, Match.Integer);

  const filter = { seasonId, state: { $ne: 'planning' } };

  publishTotalCount('totalCountOfProductList', dbProducts.find(filter), this);

  const fields = {
    companyId: 1,
    seasonId: 1,
    state: 1,
    productName: 1,
    type: 1,
    rating: 1,
    description: 1,
    url: 1,
    voteCount: 1
  };

  if (this.userId && hasRole(Meteor.users.findOne(this.userId), 'fscMember')) {
    ADMIN_ONLY_FIELDS.forEach((fieldName) => {
      fields[fieldName] = 1;
    });
  }

  return dbProducts.find(filter, {
    fields,
    sort: { [sortBy]: sortDir },
    skip: offset,
    limit: 30,
    disableOplog: true
  });
});
// 一分鐘最多重複訂閱10次
limitSubscription('productListBySeasonId', 10);
