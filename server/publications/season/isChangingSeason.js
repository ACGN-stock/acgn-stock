import { Meteor } from 'meteor/meteor';

import { dbResourceLock } from '/db/dbResourceLock';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('isChangingSeason', function() {
  debug.log('publish isChangingSeason');

  return dbResourceLock.find({ _id: 'season' }, { fields: { _id: 1 } });
});
// 一分鐘最多重複訂閱5次
limitSubscription('isChangingSeason', 5);
