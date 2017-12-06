import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbProducts } from '/db/dbProducts';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('companyCurrentProduct', function(companyId) {
  debug.log('publish companyCurrentProduct', companyId);
  check(companyId, String);
  const overdue = 1;
  const disableOplog = true;

  return dbProducts.find({companyId, overdue}, {disableOplog});
});
//一分鐘最多20次
limitSubscription('companyCurrentProduct');
