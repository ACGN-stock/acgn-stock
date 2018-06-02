import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbViolationCases } from '/db/dbViolationCases';
import { dbCompanies } from '/db/dbCompanies';
import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

Meteor.methods({
  confiscateCompanyProfit({ companyId, reason, amount, violationCaseId }) {
    check(this.userId, String);
    check(companyId, String);
    check(reason, String);
    check(amount, Match.Integer);
    check(violationCaseId, Match.Optional(String));

    confiscateCompanyProfit(Meteor.user(), { companyId, reason, amount, violationCaseId });

    return true;
  }
});

function confiscateCompanyProfit(currentUser, { companyId, reason, amount, violationCaseId }) {
  debug.log('confiscateCompanyProfit', { user: currentUser, companyId, reason, amount, violationCaseId });

  guardUser(currentUser).checkHasRole('fscMember');

  if (amount === 0) {
    throw new Meteor.Error(403, '罰金不得為 0！');
  }

  if (violationCaseId) {
    dbViolationCases.findByIdOrThrow(violationCaseId, { fields: { _id: 1 } });
  }

  dbCompanies.findByIdOrThrow(companyId, { fields: { _id: 1 } });

  dbLog.insert({
    logType: amount > 0 ? '課以罰款' : '退還罰款',
    companyId,
    userId: [currentUser._id],
    data: {
      reason,
      fine: Math.abs(amount),
      violationCaseId
    },
    createdAt: new Date()
  });

  dbCompanies.update(companyId, { $inc: { 'profit': -amount } });
}
