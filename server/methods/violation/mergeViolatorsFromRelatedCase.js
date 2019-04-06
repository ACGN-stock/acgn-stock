import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { _ } from 'meteor/underscore';

import { dbViolationCases } from '/db/dbViolationCases';
import { dbViolationCaseActionLogs, actionMap } from '/db/dbViolationCaseActionLogs';
import { guardUser } from '/common/imports/guards';
import { notifyUnreadUsers } from './helpers';

Meteor.methods({
  mergeViolatorsFromRelatedCase({ violationCaseId, relatedCaseId, reason }) {
    check(this.userId, String);
    check(violationCaseId, String);
    check(relatedCaseId, String);
    check(reason, String);

    mergeViolatorsFromRelatedCase(Meteor.user(), { violationCaseId, relatedCaseId, reason });

    return true;
  }
});

function mergeViolatorsFromRelatedCase(currentUser, { violationCaseId, relatedCaseId, reason }) {
  guardUser(currentUser).checkHasRole('fscMember');

  const { state, relatedCases, violators: originalViolators, informer } = dbViolationCases.findByIdOrThrow(violationCaseId, {
    fields: { state: 1, relatedCases: 1, violators: 1, informer: 1 }
  });
  const { allowedStates } = actionMap.mergeViolatorsFromRelatedCase;

  if (allowedStates && ! allowedStates.includes(state)) {
    throw new Meteor.Error(403, '案件狀態不符！');
  }

  if (! relatedCases.includes(relatedCaseId)) {
    throw new Meteor.Error(403, '案件並未設為相關！');
  }

  const { violators: relatedCaseViolators } = dbViolationCases.findByIdOrThrow(relatedCaseId, {
    fields: { violators: 1 }
  });

  const newViolators = relatedCaseViolators.filter((violator) => {
    return ! _.findWhere(originalViolators, violator);
  });

  if (_.isEmpty(newViolators)) {
    throw new Meteor.Error(403, '沒有違規名單需要併入！');
  }

  // 標記合併過來的被檢舉人以及本案之舉報人未讀
  const newUnreadUsers = [
    ..._.chain(newViolators).where({ violatorType: 'user' }).pluck('violatorId').value(),
    informer
  ];

  const now = new Date();

  dbViolationCases.update({ _id: violationCaseId }, {
    $set: { updatedAt: now },
    $addToSet: { unreadUsers: { $each: newUnreadUsers } },
    $push: { violators: { $each: newViolators } }
  });
  notifyUnreadUsers(violationCaseId);

  dbViolationCaseActionLogs.insert({
    violationCaseId,
    action: 'mergeViolatorsFromRelatedCase',
    executor: currentUser._id,
    executedAt: now,
    data: { relatedCaseId, newViolators, reason }
  });
}
