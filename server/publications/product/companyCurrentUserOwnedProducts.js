import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { getCurrentSeason } from '/db/dbSeason';
import { dbUserOwnedProducts } from '/db/dbUserOwnedProducts';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('companyCurrentUserOwnedProducts', function(companyId) {
  debug.log('publish companyCurrentUserOwnedProducts', { companyId });

  check(this.userId, String);
  check(companyId, String);

  const { _id: seasonId } = getCurrentSeason();

  return dbUserOwnedProducts.find({ seasonId, companyId, userId: this.userId });
});

limitSubscription('companyCurrentUserOwnedProducts');
