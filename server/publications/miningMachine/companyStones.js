import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbCompanyStones } from '/db/dbCompanyStones';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';
import { publishWithScope } from '/server/imports/utils/publishWithScope';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('companyStones', function({ companyId, offset }) {
  debug.log('publish companyStones', { companyId, offset });

  check(companyId, new Match.Optional(String));
  check(offset, Match.Integer);

  const filter = { companyId };

  publishTotalCount('totalCountOfCompanyStones', dbCompanyStones.find(filter), this);

  publishWithScope(this, {
    collection: 'companyStones',
    scope: 'companyStones',
    cursor: dbCompanyStones.find(filter, {
      sort: { placedAt: -1 },
      skip: offset,
      limit: Meteor.settings.public.dataNumberPerPage.companyStones,
      disableOplog: true
    })
  });

  this.ready();
});

limitSubscription('companyStones');
