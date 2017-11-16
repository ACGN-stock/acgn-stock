import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbFoundations } from '/db/dbFoundations';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { limitMethod } from '/server/imports/rateLimit';
import { debug } from '/server/imports/debug';

Meteor.methods({
  changeFoundCompanyName(foundationId, companyName) {
    check(this.userId, String);
    check(foundationId, String);
    check(companyName, String);
    changeFoundCompanyName(Meteor.user(), foundationId, companyName);

    return true;
  }
});
function changeFoundCompanyName(user, foundationId, companyName) {
  debug.log('changeFoundCompanyName', {user, foundationId, companyName});
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '您並非金融管理會委員，無法進行此操作！');
  }
  const foundCompanyData = dbFoundations.findOne(foundationId, {
    fields: {
      companyName: 1
    }
  });
  if (! foundCompanyData) {
    throw new Meteor.Error(404, '找不到要編輯的新創計劃，該新創計劃可能已經創立成功或失敗！');
  }
  dbFoundations.update(foundationId, {
    $set: {
      companyName: companyName
    }
  });
  dbCompanyArchive.update(foundationId, {
    $set: {
      name: companyName
    }
  });
}
limitMethod('changeFoundCompanyName');
