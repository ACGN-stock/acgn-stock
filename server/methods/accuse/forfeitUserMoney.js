import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

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

  guardUser(user).checkHasRole('fscMember');

  if (amount === 0) {
    throw new Meteor.Error(403, '罰金不得為 0！');
  }

  Meteor.users.findByIdOrThrow(userId, { fields: { _id: 1 } });

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
