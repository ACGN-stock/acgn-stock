import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbProductLike } from '/db/dbProductLike';
import { dbVoteRecord } from '/db/dbVoteRecord';
import { limitSubscription } from '/server/imports/rateLimit';
import { debug } from '/server/imports/debug';

Meteor.publish('queryMyLikeProduct', function(companyId) {
  debug.log('publish queryMyLikeProduct', companyId);
  check(companyId, String);
  const userId = this.userId;

  if (userId) {
    return [
      dbProductLike.find({companyId, userId}, {
        fields: {
          productName: 0,
          url: 0
        }
      }),
      dbVoteRecord.find({companyId, userId})
    ];
  }
  else {
    return [];
  }
});
//十秒中最多30次(產品中心)
limitSubscription('queryMyLikeProduct', 30, 10000);
