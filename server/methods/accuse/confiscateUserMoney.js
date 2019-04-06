import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbViolationCases } from '/db/dbViolationCases';
import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';
import { notifyUsersForFscLog } from './helpers';

Meteor.methods({
  confiscateUserMoney({ userId, reason, amount, violationCaseId }) {
    check(this.userId, String);
    check(userId, String);
    check(reason, String);
    check(amount, Match.Integer);
    check(violationCaseId, Match.Optional(String));

    confiscateUserMoney(Meteor.user(), { userId, reason, amount, violationCaseId });

    return true;
  }
});

function confiscateUserMoney(currentUser, { userId, reason, amount, violationCaseId }) {
  debug.log('confiscateUserMoney', { user: currentUser, userId, reason, amount, violationCaseId });

  guardUser(currentUser).checkHasRole('fscMember');

  if (amount === 0) {
    throw new Meteor.Error(403, '罰金不得為 0！');
  }

  Meteor.users.findByIdOrThrow(userId, { fields: { _id: 1 } });

  if (violationCaseId) {
    dbViolationCases.findByIdOrThrow(violationCaseId, { fields: { _id: 1 } });
  }

  dbLog.insert({
    logType: amount > 0 ? '課以罰款' : '退還罰款',
    userId: [currentUser._id, userId],
    data: {
      reason: reason,
      fine: Math.abs(amount),
      violationCaseId
    },
    createdAt: new Date()
  });
  notifyUsersForFscLog(userId);

  Meteor.users.update(userId, { $inc: { 'profile.money': -amount } });
}
