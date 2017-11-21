import { Meteor } from 'meteor/meteor';

import { dbCompanies } from '/db/dbCompanies';
import { dbProducts } from '/db/dbProducts';
import { limitSubscription } from '/server/imports/rateLimit';
import { debug } from '/server/imports/debug';

Meteor.publish('companyDataForEdit', function(companyId) {
  debug.log('publish companyDataForEdit', companyId);
  if (typeof this.userId !== 'string') {
    return [];
  }
  const user = Meteor.users.findOne(this.userId, {
    fields: {
      'profile.isAdmin': true
    }
  });
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      manager: 1
    }
  });
  if (
    companyData &&
    (
      companyData.manager === this.userId ||
      user.profile.isAdmin
    )
  ) {
    const overdue = 0;

    return [
      dbCompanies.find(companyId),
      dbProducts.find({companyId, overdue})
    ];
  }
  else {
    return [];
  }
});
//一分鐘最多10次
limitSubscription('companyDataForEdit', 10);
