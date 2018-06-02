import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { dbCompanies } from '/db/dbCompanies';
import { dbFoundations } from '/db/dbFoundations';
import { dbLog } from '/db/dbLog';
import { dbViolationCases } from '/db/dbViolationCases';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

Meteor.methods({
  markCompanyIllegal({ companyId, reason, violationCaseId }) {
    check(this.userId, String);
    check(companyId, String);
    check(reason, String);
    check(violationCaseId, Match.Optional(String));

    markCompanyIllegal(Meteor.user(), { companyId, reason, violationCaseId });

    return true;
  }
});
function markCompanyIllegal(user, { companyId, reason, violationCaseId }) {
  debug.log('markCompanyIllegal', { user, companyId, reason, violationCaseId });

  guardUser(user).checkHasRole('fscMember');

  if (violationCaseId) {
    dbViolationCases.findByIdOrThrow(violationCaseId, { fields: { _id: 1 } });
  }

  const { status } = dbCompanyArchive.findByIdOrThrow(companyId, { fields: { status: 1 } });

  switch (status) {
    case 'foundation':
      dbFoundations.update(companyId, { $set: { illegalReason: reason } });
      break;
    case 'market':
      dbCompanies.update(companyId, { $set: { illegalReason: reason } });
      break;
  }

  dbLog.insert({
    logType: '違規標記',
    userId: [user._id],
    companyId,
    data: { reason, violationCaseId },
    createdAt: new Date()
  });
}
limitMethod('markCompanyIllegal');
