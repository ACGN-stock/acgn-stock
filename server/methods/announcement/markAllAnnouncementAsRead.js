import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbAnnouncements } from '/db/dbAnnouncements';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { dbNotifications, notificationCategories } from '/db/dbNotifications';

Meteor.methods({
  markAllAnnouncementsAsRead() {
    check(this.userId, String);
    markAllAnnouncementsAsRead(Meteor.user());

    return true;
  }
});

export function markAllAnnouncementsAsRead(currentUser) {
  debug.log('markAllAnnouncementsAsRead', { currentUser });
  dbAnnouncements.update({ }, { $addToSet: { readers: currentUser._id } }, { multi: true });
  dbNotifications.remove({ category: notificationCategories.ANNOUNCEMENT, targetUser: currentUser._id });
}
// 一分鐘最多一次
limitMethod('markAllAnnouncementsAsRead', 1, 60000);
