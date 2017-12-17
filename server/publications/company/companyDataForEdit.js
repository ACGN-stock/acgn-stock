import { Meteor } from 'meteor/meteor';

import { dbCompanies } from '/db/dbCompanies';
import { dbProducts } from '/db/dbProducts';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

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
      dbCompanies.find(companyId, {
        fields: {
          tags: 1,
          pictureSmall: 1,
          pictureBig: 1,
          description: 1
        }
      }),
      dbProducts.find({companyId, overdue})
    ];
  }
  else {
    return [];
  }
});
//一分鐘最多10次
limitSubscription('companyDataForEdit', 10);
