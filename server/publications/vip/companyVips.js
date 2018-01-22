import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbVips } from '/db/dbVips';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';
import { publishWithScope } from '/server/imports/utils/publishWithScope';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('companyVips', function({ companyId, level, offset }) {
  debug.log('publish companyVips', { companyId, level, offset });
  check(companyId, String);
  check(level, new Match.Optional(Number));
  check(offset, Match.Integer);

  const filter = { companyId, level };
  if (! Number.isFinite(level)) {
    delete filter.level;
  }

  publishTotalCount('totalCountOfCompanyVips', dbVips.find(filter), this);

  publishWithScope(this, {
    collection: 'vips',
    scope: 'companyVips',
    cursor: dbVips.find(filter, {
      sort: { score: -1, createdAt: 1 },
      skip: offset,
      limit: Meteor.settings.public.dataNumberPerPage.companyVips,
      disableOplog: true
    })
  });

  this.ready();
});

// 一分鐘最多20次
limitSubscription('companyVips');
