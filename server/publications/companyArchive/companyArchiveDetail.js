import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('companyArchiveDetail', function(companyId) {
  debug.log('publish companyArchiveDetail', {companyId});
  check(companyId, String);

  return dbCompanyArchive.find(companyId);
});
//一分鐘最多10次
limitSubscription('companyArchiveDetail', 10);
