import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';

Meteor.publish('accountManagerTitle', function(userId, offset) {
  debug.log('publish accountManagerTitle', { userId, offset });
  check(userId, String);
  check(offset, Match.Integer);

  const filter = { manager: userId, isSeal: false };

  publishTotalCount('totalCountOfManagerTitle', dbCompanies.find(filter), this);

  return dbCompanies
    .find(filter, {
      fields: {
        isSeal: 1,
        manager: 1
      },
      skip: offset,
      limit: 10,
      disableOplog: true
    });
});
// 一分鐘最多20次
limitSubscription('accountManagerTitle');
