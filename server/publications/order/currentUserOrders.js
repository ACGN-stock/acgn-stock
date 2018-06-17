import { Meteor } from 'meteor/meteor';

import { dbOrders } from '/db/dbOrders';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { publishWithScope } from '/server/imports/utils/publishWithScope';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('currentUserOrders', function() {
  debug.log('publish currentUserOrders');
  const userId = this.userId;
  if (! userId) {
    return [];
  }

  publishWithScope(this, {
    collection: 'orders',
    cursor: dbOrders.find({ userId }),
    scope: 'currentUser'
  });

  this.ready();
});
// 一分鐘最多30次
limitSubscription('currentUserOrders', 30);
