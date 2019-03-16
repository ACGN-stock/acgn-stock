import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbDirectors } from '/db/dbDirectors';
import { dbViolationCases } from '/db/dbViolationCases';
import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';
import { notifyUsersForFscLog } from './helpers';

Meteor.methods({
  confiscateUserStocks({ userId, companyId, reason, violationCaseId }) {
    check(this.userId, String);
    check(userId, String);
    check(companyId, String);
    check(reason, String);
    check(violationCaseId, Match.Optional(String));

    confiscateUserStocks(Meteor.user(), { userId, companyId, reason, violationCaseId });

    return true;
  }
});
function confiscateUserStocks(currentUser, { userId, companyId, reason, violationCaseId }) {
  debug.log('confiscateUserStocks', { user: currentUser, userId, companyId, reason, violationCaseId });

  guardUser(currentUser).checkHasRole('fscMember');

  Meteor.users.findByIdOrThrow(userId, { fields: { _id: 1 } });

  const { stocks } = dbDirectors.findOne({ userId, companyId }) || {};

  if (! stocks) {
    throw new Meteor.Error(`使用者 ${userId} 並未持有公司 ${companyId} 的股票！`);
  }

  if (violationCaseId) {
    dbViolationCases.findByIdOrThrow(violationCaseId, { fields: { _id: 1 } });
  }

  const cursor = dbDirectors.find({ userId });
  if (cursor.count() < 1) {
    return;
  }

  const now = new Date();

  if (! dbDirectors.findOne({ companyId, userId: '!FSC' })) {
    dbDirectors.insert({ companyId, userId: '!FSC', stocks, createdAt: now });
  }
  else {
    dbDirectors.update({ companyId, userId: '!FSC' }, { $inc: { stocks } });
  }

  dbDirectors.remove({ userId });

  dbLog.insert({
    logType: '沒收股份',
    userId: [currentUser._id, userId],
    companyId,
    data: { reason, stocks, violationCaseId },
    createdAt: now
  });
  notifyUsersForFscLog(userId);
}
