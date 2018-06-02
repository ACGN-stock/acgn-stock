import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbLog } from '/db/dbLog';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { dbFoundations } from '/db/dbFoundations';
import { dbCompanies } from '/db/dbCompanies';
import { dbViolationCases } from '/db/dbViolationCases';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

Meteor.methods({
  unmarkCompanyIllegal({ companyId, violationCaseId }) {
    check(this.userId, String);
    check(companyId, String);
    check(violationCaseId, Match.Optional(String));

    unmarkCompanyIllegal(Meteor.user(), { companyId, violationCaseId });

    return true;
  }
});
function unmarkCompanyIllegal(currentUser, { companyId, violationCaseId }) {
  debug.log('unmarkCompanyIllegal', { user: currentUser, companyId, violationCaseId });

  guardUser(currentUser).checkHasRole('fscMember');

  if (violationCaseId) {
    dbViolationCases.findByIdOrThrow(violationCaseId, { fields: { _id: 1 } });
  }

  const { status } = dbCompanyArchive.findByIdOrThrow(companyId, { fields: { status: 1 } });

  switch (status) {
    case 'foundation':
      dbFoundations.update(companyId, { $unset: { illegalReason: 1 } });
      break;
    case 'market':
      dbCompanies.update(companyId, { $unset: { illegalReason: 1 } });
      break;
  }

  dbCompanies.update(companyId, { $unset: { illegalReason: 1 } });
  dbLog.insert({
    logType: '違規解標',
    userId: [currentUser._id],
    companyId,
    data: { violationCaseId },
    createdAt: new Date()
  });
}
limitMethod('unmarkCompanyIllegal');
