import { Meteor } from 'meteor/meteor';

import { dbOrders } from '/db/dbOrders';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('queryMyOrder', function() {
  debug.log('publish queryMyOrder');
  const userId = this.userId;
  if (userId) {
    return dbOrders.find({ userId });
  }

  return [];
});
// 一分鐘最多30次
limitSubscription('queryMyOrder', 30);
