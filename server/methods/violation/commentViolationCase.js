import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { _ } from 'meteor/underscore';

import { dbViolationCases } from '/db/dbViolationCases';
import { dbViolationCaseActionLogs, actionMap, commentIdentityList } from '/db/dbViolationCaseActionLogs';
import { guardUser } from '/common/imports/guards';
import { notifyUnreadUsers } from './helpers';

Meteor.methods({
  commentViolationCase({ violationCaseId, reason, commentIdentity }) {
    check(this.userId, String);
    check(violationCaseId, String);
    check(reason, String);
    check(commentIdentity, new Match.OneOf(...commentIdentityList));

    commentViolationCase(Meteor.user(), { violationCaseId, reason });

    return true;
  }
});

export function commentViolationCase(currentUser, { violationCaseId, reason, commentIdentity }) {
  const { state, violators, informer } = dbViolationCases.findByIdOrThrow(violationCaseId, {
    fields: { state: 1, violators: 1, informer: 1 }
  });

  const { allowedStates } = actionMap.comment;

  if (allowedStates && ! allowedStates.includes(state)) {
    throw new Meteor.Error(403, '案件狀態不符！');
  }

  checkUserIdentity(currentUser, commentIdentity, { informer, violators });

  const lastFscActionLog = getLastFscActionLog(violationCaseId);

  checkUserLastCommentTime(currentUser, { violationCaseId, commentIdentity }, lastFscActionLog);

  // 標記所有被檢舉人、舉報人及最後一個動作的金管成員未讀
  const newUnreadUsers = getNewUnreadUsers(currentUser, { informer, violators }, lastFscActionLog);

  const now = new Date();

  dbViolationCases.update({ _id: violationCaseId }, {
    $set: { updatedAt: now },
    $addToSet: { unreadUsers: { $each: newUnreadUsers } }
  });
  notifyUnreadUsers(violationCaseId);

  dbViolationCaseActionLogs.insert({
    violationCaseId,
    action: 'comment',
    executor: currentUser._id,
    executedAt: now,
    data: { reason, commentIdentity }
  });
}

function checkUserIdentity(currentUser, commentIdentity, { informer, violators }) {
  switch (commentIdentity) {
    case 'fsc': {
      return guardUser(currentUser).checkHasRole('fscMember');
    }
    case 'informer': {
      if (informer !== currentUser._id) {
        throw new Meteor.Error(403, '權限不符，無法進行此操作！');
      }

      return;
    }
    case 'violator': {
      if (! _.findWhere(violators, { violatorId: currentUser._id })) {
        throw new Meteor.Error(403, '權限不符，無法進行此操作！');
      }

      return;
    }
    default: {
      throw new Meteor.Error(403, '需要選擇留下註解的身分！');
    }
  }
}

function getLastFscActionLog(violationCaseId) {
  return dbViolationCaseActionLogs.findOne({
    violationCaseId,
    $or: [
      { action: { $ne: 'comment' } },
      { 'data.commentIdentity': 'fsc' }
    ]
  }, {
    sort: { executedAt: -1 },
    fields: { executor: 1, executedAt: 1 }
  });
}

function checkUserLastCommentTime(currentUser, { violationCaseId, commentIdentity }, lastFscActionLog) {
  if (commentIdentity === 'fsc') {
    return;
  }

  const userLastCommentLog = dbViolationCaseActionLogs.findOne({
    violationCaseId,
    executor: currentUser._id,
    action: 'comment',
    'data.commentIdentity': commentIdentity
  }, {
    sort: { executedAt: -1 },
    fields: { executedAt: 1 }
  });

  if (! userLastCommentLog) {
    return;
  }
  if (lastFscActionLog && lastFscActionLog.executedAt >= userLastCommentLog.executedAt) {
    return;
  }

  throw new Meteor.Error(403, '在金管有進一步動作前，不得再次留言！');
}

function getNewUnreadUsers(currentUser, { informer, violators }, lastFscActionLog) {
  const newUnreadUsers = [
    ..._.chain(violators).where({ violatorType: 'user' }).pluck('violatorId').value(),
    informer
  ];
  if (lastFscActionLog) {
    newUnreadUsers.push(lastFscActionLog.executor);
  }

  return newUnreadUsers.filter((userId) => {
    return userId !== currentUser._id;
  });
}
