import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { dbProducts } from '/db/dbProducts';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('companyDataForEdit', function(companyId) {
  debug.log('publish companyDataForEdit', companyId);

  check(companyId, String);

  if (typeof this.userId !== 'string') {
    return [];
  }

  const user = Meteor.users.findOne(this.userId, { fields: { 'profile.isAdmin': true } });
  const companyData = dbCompanies.findOne(companyId, { fields: { manager: 1 } });

  if (! companyData) {
    return [];
  }

  if (companyData.manager === this.userId || user.profile.isAdmin) {
    return [
      dbCompanies.find(companyId, {
        fields: {
          companyName: 1,
          tags: 1,
          pictureSmall: 1,
          pictureBig: 1,
          description: 1,
          baseProductionFund: 1,
          capital: 1, // NOTE 由於目前資本額變動機會較少，不太影響公司資訊編輯，故暫時加入在此
          productPriceLimit: 1
        }
      }),
      dbProducts.find({ companyId, state: 'planning' })
    ];
  }
  else {
    return [];
  }
});
// 一分鐘最多10次
limitSubscription('companyDataForEdit', 10);
