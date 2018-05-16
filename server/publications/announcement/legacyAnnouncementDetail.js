import { Meteor } from 'meteor/meteor';

import { dbVariables } from '/db/dbVariables';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('legacyAnnouncementDetail', function() {
  debug.log('publish legacyAnnouncementDetail');

  return dbVariables.find({ _id: 'announcementDetail' }, { disableOplog: true });
});
// 一分鐘最多重複訂閱5次
limitSubscription('legacyAnnouncementDetail', 5);
