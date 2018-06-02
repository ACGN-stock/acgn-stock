import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { dbLog } from '/db/dbLog';
import { dbViolationCases } from '/db/dbViolationCases';
import { returnCompanyStones } from '/server/functions/miningMachine/returnCompanyStones';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

Meteor.methods({
  sealCompany({ companyId, reason, violationCaseId }) {
    check(this.userId, String);
    check(companyId, String);
    check(reason, String);
    check(violationCaseId, Match.Optional(String));

    sealCompany(Meteor.user(), { companyId, reason, violationCaseId });

    return true;
  }
});
function sealCompany(currentUser, { companyId, reason, violationCaseId }) {
  debug.log('sealCompany', { user: currentUser, companyId, reason, violationCaseId });

  guardUser(currentUser).checkHasRole('fscMember');

  const { isSeal } = dbCompanies.findByIdOrThrow(companyId, { fields: { isSeal: 1 } });

  if (violationCaseId) {
    dbViolationCases.findByIdOrThrow(violationCaseId, { fields: { _id: 1 } });
  }

  dbLog.insert({
    logType: isSeal ? '解除查封' : '查封關停',
    userId: [currentUser._id],
    companyId: companyId,
    data: { reason, violationCaseId },
    createdAt: new Date()
  });
  dbCompanies.update(companyId, { $set: { isSeal: ! isSeal } });

  // 查封時歸還所有石頭
  if (! isSeal) {
    returnCompanyStones(companyId);
  }
}
