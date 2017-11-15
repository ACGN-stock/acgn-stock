import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/debug';

Meteor.methods({
  accuseUser(userId, message) {
    check(this.userId, String);
    check(userId, String);
    check(message, String);
    accuseUser(Meteor.user(), userId, message);

    return true;
  }
});
function accuseUser(user, userId, message) {
  debug.log('accuseUser', {user, userId, message});
  if (_.contains(user.profile.ban, 'accuse')) {
    throw new Meteor.Error(403, '您現在被金融管理會禁止了所有舉報違規行為！');
  }
  const accuseUserData = Meteor.users.findOne(userId, {
    fields: {
      'status.lastLogin.ipAddr': 1
    }
  });
  if (! accuseUserData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + userId + '」的使用者！');
  }
  dbLog.insert({
    logType: '舉報違規',
    userId: [user._id, userId, accuseUserData.status.lastLogin.ipAddr],
    message: message,
    createdAt: new Date()
  });
}
