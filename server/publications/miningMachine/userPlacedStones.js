import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbCompanyStones } from '/db/dbCompanyStones';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('userPlacedStones', function({ userId, companyId, offset }) {
  debug.log('publish userPlacedStones', { userId });

  check(userId, String);
  check(companyId, new Match.Optional(String));
  check(offset, Match.Integer);

  const filter = { userId, companyId };
  if (! companyId) {
    delete filter.companyId;
  }

  publishTotalCount('totalCountOfUserPlacedStones', dbCompanyStones.find(filter), this);

  const dataNumberPerPage = Meteor.settings.public.dataNumberPerPage.userPlacedStones;

  return dbCompanyStones.find(filter, {
    sort: { placedAt: 1 },
    skip: offset,
    limit: dataNumberPerPage
  });
});

limitSubscription('userPlacedStones');
