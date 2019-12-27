import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbViolationCases } from '/db/dbViolationCases';
import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { guardUser } from '/common/imports/guards';
import { notifyUsersForFscLog } from './helpers';

Meteor.methods({
  clearUserAbout({ userId, reason, violationCaseId }) {
    check(this.userId, String);
    check(userId, String);
    check(reason, String);
    check(violationCaseId, Match.Optional(String));

    clearUserAbout(Meteor.user(), { userId, reason, violationCaseId });

    return true;
  }
});
export function clearUserAbout(currentUser, { userId, reason, violationCaseId }) {
  debug.log('clearUserAbout', { user: currentUser, userId, reason, violationCaseId });

  guardUser(currentUser).checkHasRole('fscMember');

  Meteor.users.findByIdOrThrow(userId, { fields: { _id: 1 } });
  if (violationCaseId) {
    dbViolationCases.findByIdOrThrow(violationCaseId, { fields: { _id: 1 } });
  }

  Meteor.users.update(userId, {
    $set: { about: {
      description: ''
    } }
  });

  dbLog.insert({
    logType: '清除簡介',
    userId: [currentUser._id, userId],
    data: { reason, violationCaseId },
    createdAt: new Date()
  });
  notifyUsersForFscLog(userId);
}

limitMethod('clearUserAbout');
