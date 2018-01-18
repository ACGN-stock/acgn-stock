import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbVoteRecord } from '/db/dbVoteRecord';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('currentUserVoteRecord', function(companyId) {
  debug.log('publish currentUserVoteRecord', companyId);
  check(companyId, String);
  const userId = this.userId;

  if (userId) {
    return dbVoteRecord.find({ companyId, userId });
  }
  else {
    return [];
  }
});
// 十秒中最多30次(產品中心)
limitSubscription('currentUserVoteRecord', 30, 10000);
