import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbFoundations } from '/db/dbFoundations';
import { limitSubscription } from '/server/imports/rateLimit';
import { debug } from '/server/imports/debug';

Meteor.publish('foundationDataForEdit', function(foundationId) {
  debug.log('publish foundationDataForEdit', {foundationId});
  check(foundationId, String);

  return dbFoundations.find(foundationId);
});
//一分鐘最多10次
limitSubscription('foundationDataForEdit', 10);
