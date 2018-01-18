import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { dbLog } from '/db/dbLog';
import { returnCompanyStones } from '/server/functions/miningMachine/returnCompanyStones';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  sealCompany({ companyId, message }) {
    check(this.userId, String);
    check(companyId, String);
    check(message, String);
    sealCompany(Meteor.user(), { companyId, message });

    return true;
  }
});
function sealCompany(user, { companyId, message }) {
  debug.log('sealCompany', { user, companyId, message });
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '您並非金融管理會委員，無法進行此操作！');
  }
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      companyName: 1,
      isSeal: 1
    }
  });
  if (! companyData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + companyId + '」的公司！');
  }
  if (companyData.isSeal) {
    dbLog.insert({
      logType: '解除查封',
      userId: [user._id],
      companyId: companyId,
      data: { reason: message },
      createdAt: new Date()
    });
    dbCompanies.update(companyId, { $set: { isSeal: false } });
  }
  else {
    dbLog.insert({
      logType: '查封關停',
      userId: [user._id],
      companyId: companyId,
      data: { reason: message },
      createdAt: new Date()
    });
    dbCompanies.update(companyId, { $set: { isSeal: true } });
    returnCompanyStones(companyId);
  }
}
