import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';
import { dbViolationCases } from '/db/dbViolationCases';
import { guardUser } from '/common/imports/guards';
import { notifyUsersForFscLog } from './helpers';

Meteor.methods({
  sendFscNotice({ userIds, companyId, message, violationCaseId }) {
    check(this.userId, String);
    check(userIds, [String]);
    check(companyId, new Match.Maybe(String));
    check(message, String);
    check(violationCaseId, Match.Optional(String));

    sendFscNotice(Meteor.user(), { userIds, companyId, message, violationCaseId });

    return true;
  }
});
function sendFscNotice(currentUser, { userIds, companyId, message, violationCaseId }) {
  debug.log('sendFscNotice', { user: currentUser, userIds, message, violationCaseId });

  guardUser(currentUser).checkHasRole('fscMember');

  const nonEmptyUserIds = userIds.filter((id) => {
    return id && id !== '!none';
  });

  if (violationCaseId) {
    dbViolationCases.findByIdOrThrow(violationCaseId, { fields: { _id: 1 } });
  }

  const now = new Date();
  dbLog.insert({
    logType: '金管通告',
    userId: [currentUser._id, ...nonEmptyUserIds],
    companyId,
    data: { message, violationCaseId },
    createdAt: now
  });
  notifyUsersForFscLog(...nonEmptyUserIds);
}
