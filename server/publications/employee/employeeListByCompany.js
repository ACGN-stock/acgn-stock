import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbEmployees } from '/db/dbEmployees';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('employeeListByCompany', function(companyId) {
  debug.log('publish employeeListByCompany', { companyId });
  check(companyId, String);
  const resigned = false;

  return dbEmployees.find({ companyId, resigned });
});
// 一分鐘最多20次
limitSubscription('employeeListByCompany');
