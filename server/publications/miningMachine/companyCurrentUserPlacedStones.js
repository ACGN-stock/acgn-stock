import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbCompanyStones } from '/db/dbCompanyStones';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('companyCurrentUserPlacedStones', function(companyId) {
  debug.log('publish companyCurrentUserPlacedStones', { companyId });

  check(companyId, new Match.Optional(String));

  if (! this.userId) {
    return [];
  }

  const filter = { userId: this.userId, companyId };
  if (! companyId) {
    delete filter.companyId;
  }

  return dbCompanyStones.find(filter, { sort: { placedAt: 1 } });
});

limitSubscription('companyCurrentUserPlacedStones');
