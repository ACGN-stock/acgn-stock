import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbVips } from '/db/dbVips';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';

Meteor.publish('accountVipTitle', function(userId, offset) {
  debug.log('publish accountVipTitle', { userId, offset });
  check(userId, String);
  check(offset, Match.Integer);

  const filter = { userId };

  publishTotalCount('totalCountOfVipTitle', dbVips.find(filter), this);

  return dbVips
    .find(filter, {
      sort: { level: -1 },
      skip: offset,
      limit: 10,
      disableOplog: true
    });
});
// 一分鐘最多20次
limitSubscription('accountVipTitle');
