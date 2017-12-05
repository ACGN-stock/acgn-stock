import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  markCompanyIllegal(companyId, reason) {
    check(this.userId, String);
    check(companyId, String);
    check(reason, String);
    markCompanyIllegal(Meteor.user(), companyId, reason);

    return true;
  }
});
function markCompanyIllegal(user, companyId, reason) {
  debug.log('markCompanyIllegal', {user, companyId, reason});
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '您並非金融管理會委員，無法進行此操作！');
  }

  if (dbCompanies.find(companyId).count() === 0) {
    throw new Meteor.Error(404, `找不到識別碼為「${companyId}」的公司！`);
  }

  dbCompanies.update(companyId, { $set: { illegalReason: reason } });
}
limitMethod('markCompanyIllegal');
