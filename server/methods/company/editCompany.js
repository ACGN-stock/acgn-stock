import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbCompanies } from '/db/dbCompanies';
import { dbLog } from '/db/dbLog';
import { checkImageUrl } from '/server/imports/utils/checkImageUrl';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { guardCompany } from '/common/imports/guards';

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
  debug.log('editCompany', { user, companyId, newCompanyData });

  const companyData = dbCompanies.findByIdOrThrow(companyId, {
    fields: {
      companyName: 1,
      manager: 1,
      pictureBig: 1,
      pictureSmall: 1,
      isSeal: 1
    }
  });

  guardCompany(companyData)
    .checkIsManageableByUser(user)
    .checkNotSealed();

  if (newCompanyData.pictureBig && companyData.pictureBig !== newCompanyData.pictureBig) {
    checkImageUrl(newCompanyData.pictureBig);
  }

  if (newCompanyData.pictureSmall && companyData.pictureSmall !== newCompanyData.pictureSmall) {
    checkImageUrl(newCompanyData.pictureSmall);
  }

  dbLog.insert({
    logType: '經理管理',
    userId: [user._id],
    companyId,
    createdAt: new Date()
  });
  dbCompanies.update(companyId, { $set: newCompanyData });
}
limitMethod('editCompany');
