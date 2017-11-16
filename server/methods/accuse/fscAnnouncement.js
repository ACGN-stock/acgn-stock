import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/debug';

Meteor.methods({
  fscAnnouncement(userId, message) {
    check(this.userId, String);
    check(userId, [String]);
    check(message, String);
    fscAnnouncement(Meteor.user(), userId, message);

    return true;
  }
});
function fscAnnouncement(user, userId, message) {
  debug.log('fscAnnouncement', {user, userId, message});
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '您並非金融管理會委員，無法進行此操作！');
  }
  dbLog.insert({
    logType: '金管通告',
    userId: [user._id, ...userId],
    message: message,
    createdAt: new Date()
  });
}
