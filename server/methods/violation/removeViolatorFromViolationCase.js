import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { _ } from 'meteor/underscore';

import { dbViolationCases, violatorTypeList, violatorTypeDisplayName } from '/db/dbViolationCases';
import { dbViolationCaseActionLogs, actionMap } from '/db/dbViolationCaseActionLogs';
import { guardUser } from '/common/imports/guards';
import { notifyUnreadUsers } from './helpers';

Meteor.methods({
  removeViolatorFromViolationCase({ violationCaseId, violatorType, violatorId, reason }) {
    check(this.userId, String);
    check(violationCaseId, String);
    check(violatorType, Match.OneOf(...violatorTypeList));
    check(violatorId, String);
    check(reason, String);

    removeViolatorFromViolationCase(Meteor.user(), { violationCaseId, violatorType, violatorId, reason });

    return true;
  }
});

function removeViolatorFromViolationCase(currentUser, { violationCaseId, violatorType, violatorId, reason }) {
  guardUser(currentUser).checkHasRole('fscMember');

  const { state, violators, informer } = dbViolationCases.findByIdOrThrow(violationCaseId, {
    fields: { state: 1, violators: 1, informer: 1 }
  });
  const { allowedStates } = actionMap.removeViolator;

  if (allowedStates && ! allowedStates.includes(state)) {
    throw new Meteor.Error(403, '案件狀態不符！');
  }

  if (! _.findWhere(violators, { violatorType, violatorId })) {
    throw new Meteor.Error(403, `${violatorTypeDisplayName(violatorType)} ${violatorId} 不在名單中！`);
  }

  // 標記所有原被檢舉人與舉報人未讀
  const newUnreadUsers = [
    ..._.chain(violators).where({ violatorType: 'user' }).pluck('violatorId').value(),
    informer
  ];

  const now = new Date();

  dbViolationCases.update({ _id: violationCaseId }, {
    $set: { updatedAt: now },
    $addToSet: { unreadUsers: { $each: newUnreadUsers } },
    $pull: { violators: { violatorType, violatorId } }
  });
  notifyUnreadUsers(violationCaseId);

  dbViolationCaseActionLogs.insert({
    violationCaseId,
    action: 'removeViolator',
    executor: currentUser._id,
    executedAt: now,
    data: { violator: { violatorType, violatorId }, reason }
  });
}
