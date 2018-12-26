import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { dbEmployees } from '/db/dbEmployees';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('accounEmployeeTitle', function(userId) {
  debug.log('publish accounEmployeeTitle', { userId });
  check(userId, String);

  const filter = { userId, resigned: false };

  return [
    dbEmployees.find(filter),
    dbCompanies.find({
      _id: {
        $in: dbEmployees.find(filter).map((companyData) => {
          return companyData.companyId;
        })
      }
    }, {
      fields: {
        isSeal: 1
      }
    })
  ];
});
// 一分鐘最多20次
limitSubscription('accounEmployeeTitle');
