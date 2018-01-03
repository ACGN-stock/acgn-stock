import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbProducts } from '/db/dbProducts';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('companyMarketingProducts', function(companyId) {
  debug.log('publish companyMarketingProducts', { companyId });
  check(companyId, String);

  return dbProducts.find({ companyId, state: 'marketing' });
});
//一分鐘最多20次
limitSubscription('companyMarketingProducts');
