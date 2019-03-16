import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbAdvertising } from '/db/dbAdvertising';
import { dbViolationCases } from '/db/dbViolationCases';
import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';
import { notifyUsersForFscLog } from './helpers';

Meteor.methods({
  takeDownAdvertising({ advertisingId, reason, violationCaseId }) {
    check(this.userId, String);
    check(advertisingId, String);
    check(violationCaseId, Match.Optional(String));

    takeDownAdvertising(Meteor.user(), { advertisingId, reason, violationCaseId });

    return true;
  }
});
function takeDownAdvertising(currentUser, { advertisingId, reason, violationCaseId }) {
  debug.log('takeDownAdvertising', { user: currentUser, advertisingId, reason, violationCaseId });

  guardUser(currentUser).checkHasRole('fscMember');

  const { userId, message } = dbAdvertising.findByIdOrThrow(advertisingId);

  if (violationCaseId) {
    dbViolationCases.findByIdOrThrow(violationCaseId, { fields: { _id: 1 } });
  }

  dbLog.insert({
    logType: '撤銷廣告',
    userId: [currentUser._id, userId],
    data: { message, reason, violationCaseId },
    createdAt: new Date()
  });
  notifyUsersForFscLog(userId);
  dbAdvertising.remove(advertisingId);
}
