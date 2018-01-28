import { Meteor } from 'meteor/meteor';

import { dbAdvertising } from '/db/dbAdvertising';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('displayAdvertising', function() {
  debug.log('publish displayAdvertising');

  return dbAdvertising.find({}, {
    sort: {
      paid: -1
    },
    limit: Meteor.settings.public.displayAdvertisingNumber,
    disableOplog: true
  });
});
// 一分鐘最多重複訂閱5次
limitSubscription('displayAdvertising', 5);
