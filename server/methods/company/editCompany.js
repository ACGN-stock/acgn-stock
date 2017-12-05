import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbCompanies } from '/db/dbCompanies';
import { dbLog } from '/db/dbLog';
import { checkImageUrl } from '/server/imports/utils/checkImageUrl';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  editCompany(companyId, newCompanyData) {
    check(this.userId, String);
    check(companyId, String);
    check(newCompanyData, {
      tags: [String],
      pictureSmall: new Match.OneOf(String, null),
      pictureBig: new Match.OneOf(String, null),
      description: String
    });
    editCompany(Meteor.user(), companyId, newCompanyData);

    return true;
  }
});
function editCompany(user, companyId, newCompanyData) {
  debug.log('editCompany', {user, companyId, newCompanyData});
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      companyName: 1,
      manager: 1,
      pictureBig: 1,
      pictureSmall: 1,
      isSeal: 1
    }
  });
  if (! companyData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + companyId + '」的公司！');
  }
  if (companyData.isSeal) {
    throw new Meteor.Error(403, '「' + companyData.companyName + '」公司已被金融管理委員會查封關停了！');
  }
  if (newCompanyData.pictureBig && companyData.pictureBig !== newCompanyData.pictureBig) {
    checkImageUrl(newCompanyData.pictureBig);
  }
  if (newCompanyData.pictureSmall && companyData.pictureSmall !== newCompanyData.pictureSmall) {
    checkImageUrl(newCompanyData.pictureSmall);
  }
  const userId = user._id;
  if (companyData.manager === '!none' && ! user.profile.isAdmin) {
    throw new Meteor.Error(401, '使用者並非金融管理會委員，無法進行此操作！');
  }
  if (companyData.manager !== '!none' && userId !== companyData.manager) {
    throw new Meteor.Error(401, '使用者並非該公司的經理人！');
  }
  dbLog.insert({
    logType: '經理管理',
    userId: [userId],
    companyId: companyId,
    createdAt: new Date()
  });
  dbCompanies.update(companyId, {
    $set: newCompanyData
  });
}
limitMethod('editCompany');
