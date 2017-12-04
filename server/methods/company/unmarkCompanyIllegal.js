import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { limitMethod } from '/server/imports/rateLimit';
import { debug } from '/server/imports/debug';

Meteor.methods({
  unmarkCompanyIllegal(companyId) {
    check(this.userId, String);
    check(companyId, String);
    unmarkCompanyIllegal(Meteor.user(), companyId);

    return true;
  }
});
function unmarkCompanyIllegal(user, companyId) {
  debug.log('unmarkCompanyIllegal', {user, companyId});
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '您並非金融管理會委員，無法進行此操作！');
  }

  if (dbCompanies.find(companyId).count() === 0) {
    throw new Meteor.Error(404, `找不到識別碼為「${companyId}」的公司！`);
  }

  dbCompanies.update(companyId, { $unset: { illegalReason: 1 } });
}
limitMethod('unmarkCompanyIllegal');
