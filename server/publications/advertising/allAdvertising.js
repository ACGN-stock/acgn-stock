import { Meteor } from 'meteor/meteor';

import { dbAdvertising } from '/db/dbAdvertising';
import { limitSubscription } from '/server/imports/rateLimit';
import { debug } from '/server/imports/debug';

Meteor.publish('allAdvertising', function() {
  debug.log('publish allAdvertising');

  return dbAdvertising.find({}, {
    disableOplog: true
  });
});
//一分鐘最多重複訂閱10次
limitSubscription('allAdvertising', 10);
