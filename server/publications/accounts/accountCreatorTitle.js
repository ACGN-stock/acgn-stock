import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';

Meteor.publish('accountCreatorTitle', function(userId, offset) {
  debug.log('publish accountCreatorTitle', { userId, offset });
  check(userId, String);
  check(offset, Match.Integer);

  const filter = { creator: userId, isSeal: false };

  publishTotalCount('totalCountOfCreatorTitle', dbCompanies.find(filter), this);

  return dbCompanies
    .find(filter, {
      fields: {
        isSeal: 1,
        creator: 1,
        createdAt: 1
      },
      sort: { createdAt: -1 },
      skip: offset,
      limit: 10,
      disableOplog: true
    });
});
// 一分鐘最多20次
limitSubscription('accountCreatorTitle');
