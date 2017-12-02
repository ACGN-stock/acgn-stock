import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbCompanies } from '/db/dbCompanies';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { dbLog } from '/db/dbLog';
import { limitMethod } from '/server/imports/rateLimit';
import { debug } from '/server/imports/debug';

Meteor.methods({
  changeCompanyName(companyId, companyName) {
    check(this.userId, String);
    check(companyId, String);
    check(companyName, String);
    changeCompanyName(Meteor.user(), companyId, companyName);

    return true;
  }
});
function changeCompanyName(user, companyId, companyName) {
  debug.log('changeCompanyName', {user, companyId, companyName});
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
  dbLog.insert({
    logType: '公司更名',
    userId: [user._id],
    data: {
      oldCompanyName: companyData.companyName
    },
    createdAt: new Date()
  });
  dbCompanies.update(companyId, {
    $set: {
      companyName: companyName
    }
  });
  dbCompanyArchive.update(companyId, {
    $set: {
      name: companyName
    }
  });
}
limitMethod('changeCompanyName');
