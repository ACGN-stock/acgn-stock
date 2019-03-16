import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { _ } from 'meteor/underscore';

import { dbViolationCases, stateMap } from '/db/dbViolationCases';
import { dbViolationCaseActionLogs, actionMap } from '/db/dbViolationCaseActionLogs';
import { guardUser } from '/common/imports/guards';
import { notifyUnreadUsers } from './helpers';

Meteor.methods({
  setViolationCaseState({ violationCaseId, nextState, reason }) {
    check(this.userId, String);
    check(nextState, Match.OneOf(...Object.keys(stateMap)));
    check(violationCaseId, String);
    check(reason, String);

    setViolationCaseState(Meteor.user(), { violationCaseId, nextState, reason });

    return true;
  }
});

function setViolationCaseState(currentUser, { violationCaseId, nextState, reason }) {
  guardUser(currentUser).checkHasRole('fscMember');

  const { state: currentState, violators, informer } = dbViolationCases.findByIdOrThrow(violationCaseId, {
    fields: { state: 1, violators: 1, informer: 1 }
  });

  const { allowedStates } = actionMap.setState;

  if (allowedStates && ! allowedStates.includes(currentState)) {
    throw new Meteor.Error(403, '案件狀態不符！');
  }

  // 標記所有被檢舉人以及舉報人未讀
  const newUnreadUsers = [
    ..._.chain(violators).where({ violatorType: 'user' }).pluck('violatorId').value(),
    informer
  ];

  const now = new Date();

  dbViolationCases.update({ _id: violationCaseId }, {
    $set: {
      state: nextState,
      updatedAt: now
    },
    $addToSet: { unreadUsers: { $each: newUnreadUsers } }
  });
  notifyUnreadUsers(violationCaseId);

  dbViolationCaseActionLogs.insert({
    violationCaseId,
    action: 'setState',
    executor: currentUser._id,
    executedAt: now,
    data: { state: nextState, reason }
  });
}
