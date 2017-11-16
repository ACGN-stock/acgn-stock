import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { limitSubscription } from '/server/imports/rateLimit';
import { dbCompanies } from '/db/dbCompanies';
import { debug } from '/server/imports/debug';

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
          manager: userId,
          isSeal: false
        },
        {
          fields: {
            companyName: 1,
            manager: 1
          },
          disableOplog: true
        }
      )
  ];
});
//一分鐘最多20次
limitSubscription('accountInfo');
