import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { _ } from 'meteor/underscore';

import { dbViolationCases } from '/db/dbViolationCases';
import { dbViolationCaseActionLogs, actionMap } from '/db/dbViolationCaseActionLogs';
import { guardUser } from '/common/imports/guards';

Meteor.methods({
  commentViolationCase({ violationCaseId, reason }) {
    check(this.userId, String);
    check(violationCaseId, String);
    check(reason, String);

    commentViolationCase(Meteor.user(), { violationCaseId, reason });

    return true;
  }
});

function commentViolationCase(currentUser, { violationCaseId, reason }) {
  guardUser(currentUser).checkHasRole('fscMember');

  const { state, violators, informer } = dbViolationCases.findByIdOrThrow(violationCaseId, {
    fields: { state: 1, violators: 1, informer: 1 }
  });

  const { allowedStates } = actionMap.comment;

  if (allowedStates && ! allowedStates.includes(state)) {
    throw new Meteor.Error(403, '案件狀態不符！');
  }

  // 標記所有被檢舉人以及舉報人未讀
  const newUnreadUsers = [
    ..._.chain(violators).where({ violatorType: 'user' }).pluck('violatorId').value(),
    informer
  ];

  const now = new Date();

  dbViolationCases.update({ _id: violationCaseId }, {
    $set: { updatedAt: now },
    $addToSet: { unreadUsers: { $each: newUnreadUsers } }
  });

  dbViolationCaseActionLogs.insert({
    violationCaseId,
    action: 'comment',
    executor: currentUser._id,
    executedAt: now,
    data: { reason }
  });
}
