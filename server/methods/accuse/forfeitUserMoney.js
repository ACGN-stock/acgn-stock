import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  forfeitUserMoney({ userId, reason, amount }) {
    check(this.userId, String);
    check(userId, String);
    check(reason, String);
    check(amount, Match.Integer);
    forfeitUserMoney(Meteor.user(), { userId, reason, amount });

    return true;
  }
});

function forfeitUserMoney(user, { userId, reason, amount }) {
  debug.log('forfeitUserMoney', { user, userId, reason, amount });
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '您並非金融管理會委員，無法進行此操作！');
  }

  if (amount === 0) {
    throw new Meteor.Error(403, '罰金不得為 0！');
  }

  if (Meteor.users.find(userId).count() < 1) {
    throw new Meteor.Error(404, `找不到識別碼為「${userId}」的使用者！`);
  }

  dbLog.insert({
    logType: amount > 0 ? '課以罰款' : '退還罰款',
    userId: [user._id, userId],
    data: {
      reason: reason,
      fine: Math.abs(amount)
    },
    createdAt: new Date()
  });

  Meteor.users.update(userId, { $inc: { 'profile.money': -amount } });
}
