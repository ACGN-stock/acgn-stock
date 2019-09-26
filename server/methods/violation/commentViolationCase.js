import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { _ } from 'meteor/underscore';

import { dbViolationCases } from '/db/dbViolationCases';
import { dbViolationCaseActionLogs, actionMap, checkUserIdentityAndCaseState } from '/db/dbViolationCaseActionLogs';
import { notifyUnreadUsers } from './helpers';

Meteor.methods({
  fscCommentViolationCase({ violationCaseId, reason }) {
    checkParams(this.userId, { violationCaseId, reason });
    fscCommentViolationCase(Meteor.user(), { violationCaseId, reason });

    return true;
  },
  informerCommentViolationCase({ violationCaseId, reason }) {
    checkParams(this.userId, { violationCaseId, reason });
    informerCommentViolationCase(Meteor.user(), { violationCaseId, reason });

    return true;
  },
  violatorCommentViolationCase({ violationCaseId, reason }) {
    checkParams(this.userId, { violationCaseId, reason });
    violatorCommentViolationCase(Meteor.user(), { violationCaseId, reason });

    return true;
  }
});

function checkParams(userId, { violationCaseId, reason }) {
  check(userId, String);
  check(violationCaseId, String);
  check(reason, String);
}


export function fscCommentViolationCase(currentUser, { violationCaseId, reason }) {
  commentViolationCase('fscComment', currentUser, { violationCaseId, reason });
}

export function informerCommentViolationCase(currentUser, { violationCaseId, reason }) {
  commentViolationCase('informerComment', currentUser, { violationCaseId, reason });
}

export function violatorCommentViolationCase(currentUser, { violationCaseId, reason }) {
  commentViolationCase('violatorComment', currentUser, { violationCaseId, reason });
}


function commentViolationCase(action, currentUser, { violationCaseId, reason }) {
  const { state, violators, informer } = dbViolationCases.findByIdOrThrow(violationCaseId, {
    fields: { state: 1, violators: 1, informer: 1 }
  });
  checkUserIdentityAndCaseState(actionMap[action], currentUser, { state, violators, informer });

  const lastFscActionLog = getLastFscActionLog(violationCaseId);
  checkUserLastCommentTime(currentUser, { violationCaseId, action }, lastFscActionLog);


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
    action,
    executor: currentUser._id,
    executedAt: now,
    data: { reason }
  });
}

function getLastFscActionLog(violationCaseId) {
  const notFscActions = Object.keys(actionMap).filter((action) => {
    return actionMap[action].allowedIdentity !== 'fsc';
  });

  return dbViolationCaseActionLogs.findOne({
    violationCaseId,
    action: { $nin: notFscActions }
  }, {
    sort: { executedAt: -1 },
    fields: { executor: 1, executedAt: 1 }
  });
}

function checkUserLastCommentTime(currentUser, { violationCaseId, action }, lastFscActionLog) {
  if (actionMap[action].allowedIdentity === 'fsc') {
    return;
  }

  const userLastCommentLog = dbViolationCaseActionLogs.findOne({
    violationCaseId,
    executor: currentUser._id,
    action
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
