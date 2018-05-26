import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbAnnouncements } from '/db/dbAnnouncements';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

Meteor.methods({
  deleteAnnouncement({ announcementId }) {
    check(this.userId, String);
    check(announcementId, String);
    deleteAnnouncement(Meteor.user(), { announcementId });

    return true;
  }
});

export function deleteAnnouncement(currentUser, args, resourceLocked = false) {
  debug.log('deleteAnnouncement', { currentUser, args, resourceLocked });

  const { announcementId } = args;
  const { creator } = dbAnnouncements.findByIdOrThrow(announcementId, { fields: { creator: 1 } });

  const { _id: currentUserId } = currentUser;

  // 若是非公告發佈人，需要符合身份組才能刪除
  if (currentUserId !== creator) {
    guardUser(currentUser).checkHasAnyRoles('superAdmin', 'generalManager');
  }

  dbAnnouncements.remove(announcementId);
}
// 一分鐘鐘最多兩次
limitMethod('deleteAnnouncement', 2, 60000);
