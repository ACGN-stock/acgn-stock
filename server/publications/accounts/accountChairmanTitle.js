import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';

Meteor.publish('accountChairmanTitle', function(userId, offset) {
  debug.log('publish accountChairmanTitle', { userId, offset });
  check(userId, String);
  check(offset, Match.Integer);

  const filter = { chairman: userId, isSeal: false };

  publishTotalCount('totalCountOfChairmanTitle', dbCompanies.find(filter), this);

  return dbCompanies
    .find(filter, {
      skip: offset,
      limit: 10,
      disableOplog: true
    });
});
// 一分鐘最多20次
limitSubscription('accountChairmanTitle');
