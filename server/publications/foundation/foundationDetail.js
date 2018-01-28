import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbFoundations } from '/db/dbFoundations';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('foundationDetail', function(foundationId) {
  debug.log('publish foundationDetail', { foundationId });
  check(foundationId, String);

  const foundation = dbFoundations.findOne(foundationId);
  if (foundation) {
    const total = foundation.invest.length;
    this.added('variables', 'totalCountOfFounder', {
      value: total
    });
  }

  return dbFoundations.find(foundationId);
});
// 一分鐘最多10次
limitSubscription('foundationDetail', 10);
