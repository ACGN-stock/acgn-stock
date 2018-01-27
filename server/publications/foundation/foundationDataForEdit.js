import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbFoundations } from '/db/dbFoundations';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('foundationDataForEdit', function(foundationId) {
  debug.log('publish foundationDataForEdit', { foundationId });
  check(foundationId, String);

  return dbFoundations.find(foundationId, {
    fields: {
      tags: 1,
      pictureSmall: 1,
      pictureBig: 1,
      description: 1
    }
  });
});
// 一分鐘最多10次
limitSubscription('foundationDataForEdit', 10);
