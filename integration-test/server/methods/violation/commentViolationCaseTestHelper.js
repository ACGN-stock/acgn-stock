import { _ } from 'meteor/underscore';

import { dbViolationCases } from '/db/dbViolationCases';
import { dbNotifications } from '/db/dbNotifications';
import { dbViolationCaseActionLogs } from '/db/dbViolationCaseActionLogs';


/**
 * @typedef {Object} CheckData { updatedAt, unreadUsers, notificationNumber, commentLog }
 * @property {Date} updatedAt
 * @property {String[]} unreadUsers
 * @property {Number} notificationNumber
 * @property {Object} commentLog
 */
/**
 * @param {String} action action
 * @param {Object} testCaseData { currentUser, violationCaseId, reason }
 * @return {CheckData} { updatedAt, unreadUsers, notificationNumber, commentLog }
 */
export function getCheckData(action, { currentUser, violationCaseId, reason }) {
  const { updatedAt, unreadUsers } = dbViolationCases.findByIdOrThrow(violationCaseId, {
    fields: { updatedAt: 1, unreadUsers: 1 }
  });
  const notificationNumber = dbNotifications.find().count();
  const commentLog = dbViolationCaseActionLogs.findOne({
    violationCaseId,
    action,
    executor: currentUser._id,
    data: { reason }
  });

  return { updatedAt, unreadUsers, notificationNumber, commentLog };
}


export function getExpectUnreadUsers({ currentUser, violationCase }, lastActionFscMember) {
  const expectUnreadUsers = [
    ..._.chain(violationCase.violators).where({ violatorType: 'user' }).pluck('violatorId').value(),
    violationCase.informer
  ];
  if (lastActionFscMember) {
    expectUnreadUsers.push(lastActionFscMember);
  }

  return expectUnreadUsers.filter((userId) => {
    return userId !== currentUser._id;
  });
}
