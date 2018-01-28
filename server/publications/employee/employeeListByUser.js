import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbEmployees } from '/db/dbEmployees';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('employeeListByUser', function(userId) {
  debug.log('publish employeeListByUser', { userId });
  check(userId, String);
  const resigned = false;

  return dbEmployees.find({ userId, resigned });
});
// 一分鐘最多20次
limitSubscription('employeeListByUser');
