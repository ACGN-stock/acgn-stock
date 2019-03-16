import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbAnnouncements } from '/db/dbAnnouncements';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';
import { dbNotifications, notificationCategories } from '/db/dbNotifications';

Meteor.methods({
  voidAnnouncement({ announcementId, reason }) {
    check(this.userId, String);
    check(announcementId, String);
    check(reason, String);
    voidAnnouncement(Meteor.user(), { announcementId, reason });

    return true;
  }
});

export function voidAnnouncement(currentUser, args, resourceLocked = false) {
  debug.log('voidAnnouncement', { currentUser, args, resourceLocked });

  const { announcementId, reason } = args;
  const { creator, voided } = dbAnnouncements.findByIdOrThrow(announcementId, {
    fields: { creator: 1, voided: 1 }
  });

  const { _id: currentUserId } = currentUser;

  if (voided) {
    throw new Meteor.Error(403, '此公告已作廢！');
  }

  // 若是非公告發佈人，需要符合身份組才能刪除
  if (currentUserId !== creator) {
    guardUser(currentUser).checkHasAnyRoles('superAdmin', 'generalManager');
  }

  dbAnnouncements.update(announcementId, {
    $set: {
      voided: true,
      voidedReason: reason,
      voidedBy: currentUserId,
      voidedAt: new Date()
    }
  });

  dbNotifications.remove({
    category: notificationCategories.ANNOUNCEMENT,
    'data.announcementId': announcementId
  });
}
// 一分鐘鐘最多兩次
limitMethod('voidAnnouncement', 2, 60000);
