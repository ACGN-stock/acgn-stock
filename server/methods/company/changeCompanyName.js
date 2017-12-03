import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbCompanies } from '/db/dbCompanies';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { dbLog } from '/db/dbLog';
import { limitMethod } from '/server/imports/rateLimit';
import { debug } from '/server/imports/debug';

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
  debug.log('changeCompanyName', {user, companyId, newCompanyName});
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '您並非金融管理會委員，無法進行此操作！');
  }
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      companyName: 1
    }
  });
  if (! companyData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + companyId + '」的公司！');
  }

  const oldCompanyName = companyData.companyName;

  dbLog.insert({
    logType: '公司更名',
    userId: [user._id],
    companyId: companyId,
    data: {
      oldCompanyName,
      newCompanyName
    },
    createdAt: new Date()
  });
  dbCompanies.update(companyId, {
    $set: {
      companyName: newCompanyName
    }
  });
  dbCompanyArchive.update(companyId, {
    $set: {
      name: newCompanyName
    }
  });
}
limitMethod('changeCompanyName');
