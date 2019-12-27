import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('accountInfo', function(userId) {
  debug.log('publish accountInfo', userId);
  check(userId, String);

  return Meteor.users.find(userId, {
    fields: {
      'services.google.email': 1,
      'status.lastLogin.date': 1,
      'status.lastLogin.ipAddr': 1,
      username: 1,
      profile: 1,
      about: 1,
      createdAt: 1
    }
  });
});
// 一分鐘最多20次
limitSubscription('accountInfo');
