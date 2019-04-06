import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbViolationCases } from '/db/dbViolationCases';
import { dbViolationCaseActionLogs, actionMap } from '/db/dbViolationCaseActionLogs';
import { guardUser } from '/common/imports/guards';
import { notifyUnreadUsers } from '/server/methods/violation/helpers';

Meteor.methods({
  addRelatedCaseToViolationCase({ violationCaseId, relatedCaseId, reason }) {
    check(this.userId, String);
    check(violationCaseId, String);
    check(relatedCaseId, String);
    check(reason, String);

    addRelatedCaseToViolationCase(Meteor.user(), { violationCaseId, relatedCaseId, reason });

    return true;
  }
});

function addRelatedCaseToViolationCase(currentUser, { violationCaseId, relatedCaseId, reason }) {
  if (violationCaseId === relatedCaseId) {
    throw new Meteor.Error(403, '案件無法狀自身設為相關案件！');
  }

  guardUser(currentUser).checkHasRole('fscMember');

  const { state, relatedCases, informer } = dbViolationCases.findByIdOrThrow(violationCaseId, {
    fields: { state: 1, relatedCases: 1, informer: 1 }
  });

  const { allowedStates } = actionMap.addRelatedCase;

  if (allowedStates && ! allowedStates.includes(state)) {
    throw new Meteor.Error(403, '案件狀態不符！');
  }

  if (relatedCases.includes(relatedCaseId)) {
    throw new Meteor.Error(403, '案件已經設為相關！');
  }

  const { informer: relatedCaseInformer } = dbViolationCases.findByIdOrThrow(relatedCaseId, {
    fields: { informer: 1 }
  });

  const now = new Date();

  dbViolationCases.update({ _id: violationCaseId }, {
    $set: { updatedAt: now },
    $addToSet: {
      relatedCases: relatedCaseId,
      unreadUsers: informer
    }
  });
  notifyUnreadUsers(violationCaseId);

  dbViolationCaseActionLogs.insert({
    violationCaseId,
    action: 'addRelatedCase',
    executor: currentUser._id,
    executedAt: now,
    data: { relatedCaseId, reason }
  });

  dbViolationCases.update({ _id: relatedCaseId }, {
    $set: { updatedAt: now },
    $addToSet: {
      relatedCases: violationCaseId,
      unreadUsers: relatedCaseInformer
    }
  });
  notifyUnreadUsers(relatedCaseId);

  dbViolationCaseActionLogs.insert({
    violationCaseId: relatedCaseId,
    action: 'addRelatedCase',
    executor: currentUser._id,
    executedAt: now,
    data: { relatedCaseId: violationCaseId, reason }
  });
}
