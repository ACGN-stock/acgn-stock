import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbCompanies } from '/db/dbCompanies';
import { dbFoundations } from '/db/dbFoundations';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { dbViolationCases } from '/db/dbViolationCases';
import { dbLog } from '/db/dbLog';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

Meteor.methods({
  changeCompanyName({ companyId, newCompanyName, violationCaseId }) {
    check(this.userId, String);
    check(companyId, String);
    check(newCompanyName, String);
    check(violationCaseId, Match.Optional(String));

    changeCompanyName(Meteor.user(), { companyId, newCompanyName, violationCaseId });

    return true;
  }
});
function changeCompanyName(user, { companyId, newCompanyName, violationCaseId }) {
  debug.log('changeCompanyName', { user, companyId, newCompanyName, violationCaseId });

  guardUser(user).checkHasRole('fscMember');

  if (violationCaseId) {
    dbViolationCases.findByIdOrThrow(violationCaseId, { fields: { _id: 1 } });
  }

  const { name: oldCompanyName } = dbCompanyArchive.findByIdOrThrow(companyId, { fields: { name: 1 } });

  dbLog.insert({
    logType: '公司更名',
    userId: [user._id],
    companyId: companyId,
    data: { oldCompanyName, newCompanyName, violationCaseId },
    createdAt: new Date()
  });
  dbCompanies.update(companyId, { $set: { companyName: newCompanyName } });
  dbFoundations.update(companyId, { $set: { companyName: newCompanyName } });
  dbCompanyArchive.update(companyId, { $set: { name: newCompanyName } });
}
limitMethod('changeCompanyName');
