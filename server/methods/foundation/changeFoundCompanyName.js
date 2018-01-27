import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbFoundations } from '/db/dbFoundations';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { dbLog } from '/db/dbLog';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  changeFoundCompanyName(companyId, newCompanyName) {
    check(this.userId, String);
    check(companyId, String);
    check(newCompanyName, String);
    changeFoundCompanyName(Meteor.user(), companyId, newCompanyName);

    return true;
  }
});
function changeFoundCompanyName(user, companyId, newCompanyName) {
  debug.log('changeFoundCompanyName', { user, companyId, newCompanyName });
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '您並非金融管理會委員，無法進行此操作！');
  }
  const foundCompanyData = dbFoundations.findOne(companyId, {
    fields: {
      companyName: 1
    }
  });
  if (! foundCompanyData) {
    throw new Meteor.Error(404, '找不到要編輯的新創計劃，該新創計劃可能已經創立成功或失敗！');
  }

  const oldCompanyName = foundCompanyData.companyName;

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
  dbFoundations.update(companyId, {
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
limitMethod('changeFoundCompanyName');
