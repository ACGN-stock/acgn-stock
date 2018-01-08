import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbUserOwnedProducts } from '/db/dbUserOwnedProducts';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('userOwnedProducts', function({ userId, offset }) {
  debug.log('publish userOwnedProducts', { userId });

  check(userId, String);
  check(offset, Match.Integer);

  const filter = { userId };

  publishTotalCount('totalCountOfUserOwnedProducts', dbUserOwnedProducts.find(filter), this);

  const dataNumberPerPage = Meteor.settings.public.dataNumberPerPage.userOwnedProducts;

  return dbUserOwnedProducts.find(filter, {
    sort: { createdAt: 1 },
    skip: offset,
    limit: dataNumberPerPage
  });
});

limitSubscription('userOwnedProducts');
