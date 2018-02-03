import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbVips } from '/db/dbVips';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('currentUserCompanyVip', function(companyId) {
  debug.log('publish currentUserCompanyVip', { companyId });
  check(companyId, String);

  if (! this.userId) {
    return [];
  }

  return dbVips.find({ userId: this.userId, companyId });
});

// 一分鐘最多20次
limitSubscription('currentUserCompanyVip');
