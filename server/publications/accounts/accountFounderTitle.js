import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';

Meteor.publish('accountFounderTitle', function(userId, offset) {
  debug.log('publish accountFounderTitle', { userId, offset });
  check(userId, String);
  check(offset, Match.Integer);

  const filter = { founder: userId, isSeal: false };

  publishTotalCount('totalCountOfFounderTitle', dbCompanies.find(filter), this);

  return dbCompanies
    .find(filter, {
      fields: {
        isSeal: 1,
        founder: 1,
        createdAt: 1
      },
      sort: { createdAt: -1 },
      skip: offset,
      limit: 10,
      disableOplog: true
    });
});
// 一分鐘最多20次
limitSubscription('accountFounderTitle');
