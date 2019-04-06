import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbViolationCases } from '/db/dbViolationCases';
import { dbViolationCaseActionLogs, actionMap } from '/db/dbViolationCaseActionLogs';
import { guardUser } from '/common/imports/guards';
import { notifyUnreadUsers } from './helpers';

Meteor.methods({
  removeRelatedCaseFromViolationCase({ violationCaseId, relatedCaseId, reason }) {
    check(this.userId, String);
    check(violationCaseId, String);
    check(relatedCaseId, String);
    check(reason, String);

    removeRelatedCaseFromViolationCase(Meteor.user(), { violationCaseId, relatedCaseId, reason });

    return true;
  }
});

function removeRelatedCaseFromViolationCase(currentUser, { violationCaseId, relatedCaseId, reason }) {
  guardUser(currentUser).checkHasRole('fscMember');

  const { state, relatedCases, informer } = dbViolationCases.findByIdOrThrow(violationCaseId, {
    fields: { state: 1, relatedCases: 1, informer: 1 }
  });

  const { allowedStates } = actionMap.removeRelatedCase;

  if (allowedStates && ! allowedStates.includes(state)) {
    throw new Meteor.Error(403, '案件狀態不符！');
  }

  if (! relatedCases.includes(relatedCaseId)) {
    throw new Meteor.Error(403, '案件並未設為相關！');
  }

  const { informer: relatedCaseInformer } = dbViolationCases.findByIdOrThrow(relatedCaseId, { fields: { informer: 1 } });

  const now = new Date();

  dbViolationCases.update({ _id: violationCaseId }, {
    $set: { updatedAt: now },
    $addToSet: { unreadUsers: informer },
    $pull: { relatedCases: relatedCaseId }
  });
  notifyUnreadUsers(violationCaseId);

  dbViolationCaseActionLogs.insert({
    violationCaseId,
    action: 'removeRelatedCase',
    executor: currentUser._id,
    executedAt: now,
    data: { relatedCaseId, reason }
  });

  dbViolationCases.update({ _id: relatedCaseId }, {
    $set: { updatedAt: now },
    $addToSet: { unreadUsers: relatedCaseInformer },
    $pull: { relatedCases: violationCaseId }
  });
  notifyUnreadUsers(relatedCaseId);

  dbViolationCaseActionLogs.insert({
    violationCaseId: relatedCaseId,
    action: 'removeRelatedCase',
    executor: currentUser._id,
    executedAt: now,
    data: { relatedCaseId: violationCaseId, reason }
  });
}
