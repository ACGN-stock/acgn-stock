import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { check } from 'meteor/check';

import { dbAnnouncements } from '/db/dbAnnouncements';
import { dbNotifications, notificationCategories } from '/db/dbNotifications';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { publishWithTransformation } from '/server/imports/utils/publishWithTransformation';

Meteor.publish('announcementDetail', function(announcementId) {
  debug.log('publish announcementDetail');
  check(announcementId, String);

  // 消除未讀通知並建立已讀標記
  if (this.userId) {
    dbNotifications.remove({
      category: notificationCategories.ANNOUNCEMENT,
      targetUser: this.userId,
      'data.announcementId': announcementId
    });
    dbAnnouncements.update(announcementId, { $addToSet: { readers: this.userId } });
  }

  publishWithTransformation(this, {
    collection: 'announcements',
    cursor: dbAnnouncements.find(announcementId, { fields: { readers: 0 } }),
    transform: (fields) => {
      const result = { ..._.omit(fields, 'rejectionPetition', 'rejectionPoll') };

      if (fields.rejectionPetition) {
        result.hasRejectionPetition = !! fields.rejectionPetition;
      }

      if (fields.rejectionPoll) {
        result.hasRejectionPoll = !! fields.rejectionPoll;
      }

      return result;
    }
  });

  this.ready();
});
// 一分鐘最多20次
limitSubscription('announcementDetail', 20);
