import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { limitSubscription } from '/server/imports/utils/rateLimit';
import { dbCompanies } from '/db/dbCompanies';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('accountInfo', function(userId) {
  debug.log('publish accountInfo', userId);
  check(userId, String);

  return [
    Meteor.users.find(userId, {
      fields: {
        'services.google.email': 1,
        'status.lastLogin.date': 1,
        'status.lastLogin.ipAddr': 1,
        username: 1,
        profile: 1,
        createdAt: 1
      }
    }),
    dbCompanies
      .find(
        {
          $or: [
            {
              manager: userId
            },
            {
              chairman: userId
            }
          ],
          isSeal: false
        },
        {
          fields: {
            companyName: 1,
            manager: 1,
            chairman: 1
          },
          disableOplog: true
        }
      )
  ];
});
//一分鐘最多20次
limitSubscription('accountInfo');
