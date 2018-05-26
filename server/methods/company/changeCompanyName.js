import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbCompanies } from '/db/dbCompanies';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { dbLog } from '/db/dbLog';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

Meteor.methods({
  changeCompanyName(companyId, newCompanyName) {
    check(this.userId, String);
    check(companyId, String);
    check(newCompanyName, String);
    changeCompanyName(Meteor.user(), companyId, newCompanyName);

    return true;
  }
});
function changeCompanyName(user, companyId, newCompanyName) {
  debug.log('changeCompanyName', { user, companyId, newCompanyName });

  guardUser(user).checkHasRole('fscMember');

  const { companyName: oldCompanyName } = dbCompanies.findByIdOrThrow(companyId, { fields: { companyName: 1 } });

  dbLog.insert({
    logType: '公司更名',
    userId: [user._id],
    companyId: companyId,
    data: { oldCompanyName, newCompanyName },
    createdAt: new Date()
  });
  dbCompanies.update(companyId, { $set: { companyName: newCompanyName } });
  dbCompanyArchive.update(companyId, { $set: { name: newCompanyName } });
}
limitMethod('changeCompanyName');
