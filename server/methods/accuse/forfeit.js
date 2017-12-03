import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/debug';

Meteor.methods({
  forfeit({userId, message, amount}) {
    check(this.userId, String);
    check(userId, String);
    check(message, String);
    check(amount, Match.Integer);
    forfeit(Meteor.user(), {userId, message, amount});

    return true;
  }
});
function forfeit(user, {userId, message, amount}) {
  debug.log('forfeit', {user, userId, message, amount});
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '您並非金融管理會委員，無法進行此操作！');
  }
  if (Meteor.users.find(userId).count() < 1) {
    throw new Meteor.Error(404, '找不到識別碼為「' + userId + '」的使用者！');
  }
  amount *= -1;
  if (amount <= 0) {
    dbLog.insert({
      logType: '課以罰款',
      userId: [user._id, userId],
      data: {
        reason: message,
        fine: amount * -1
      },
      createdAt: new Date()
    });
  }
  else {
    dbLog.insert({
      logType: '退還罰款',
      userId: [user._id, userId],
      data: {
        reason: message,
        find: amount
      },
      createdAt: new Date()
    });
  }
  Meteor.users.update(userId, {
    $inc: {
      'profile.money': amount
    }
  });
}
