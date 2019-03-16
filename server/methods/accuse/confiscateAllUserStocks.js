import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbDirectors } from '/db/dbDirectors';
import { dbViolationCases } from '/db/dbViolationCases';
import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';
import { notifyUsersForFscLog } from './helpers';

Meteor.methods({
  confiscateAllUserStocks({ userId, reason, violationCaseId }) {
    check(this.userId, String);
    check(userId, String);
    check(reason, String);
    check(violationCaseId, Match.Optional(String));

    confiscateAllUserStocks(Meteor.user(), { userId, reason, violationCaseId });

    return true;
  }
});
function confiscateAllUserStocks(currentUser, { userId, reason, violationCaseId }) {
  debug.log('confiscateAllUserStocks', { user: currentUser, userId, reason, violationCaseId });

  guardUser(currentUser).checkHasRole('fscMember');

  Meteor.users.findByIdOrThrow(userId, { fields: { _id: 1 } });

  if (violationCaseId) {
    dbViolationCases.findByIdOrThrow(violationCaseId, { fields: { _id: 1 } });
  }

  const cursor = dbDirectors.find({ userId });
  if (cursor.count() < 1) {
    return;
  }

  const directorsBulk = dbDirectors.rawCollection().initializeUnorderedBulkOp();
  const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
  const createdAt = new Date();
  cursor.forEach((directorData) => {
    const { companyId, stocks } = directorData;

    logBulk.insert({
      logType: '沒收股份',
      userId: [currentUser._id, userId],
      companyId,
      data: { reason, stocks, violationCaseId },
      createdAt
    });

    if (dbDirectors.find({ companyId, userId: '!FSC' }).count() > 0) {
      directorsBulk
        .find({ companyId, userId: '!FSC' })
        .updateOne({ $inc: { stocks } });
    }
    else {
      directorsBulk.insert({
        companyId,
        userId: '!FSC',
        stocks,
        createdAt
      });
    }
  });
  logBulk.execute();
  directorsBulk.execute();
  dbDirectors.remove({ userId });
  notifyUsersForFscLog(userId);
}
