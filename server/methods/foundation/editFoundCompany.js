import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbFoundations } from '/db/dbFoundations';
import { checkImageUrl } from '/server/imports/utils/checkImageUrl';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { resourceManager } from '/server/imports/threading/resourceManager';

Meteor.methods({
  editFoundCompany(foundCompanyData) {
    check(this.userId, String);
    check(foundCompanyData, {
      _id: String,
      tags: [String],
      pictureSmall: new Match.Maybe(String),
      pictureBig: new Match.Maybe(String),
      description: String
    });
    editFoundCompany(Meteor.user(), foundCompanyData);

    return true;
  }
});
export function editFoundCompany(user, foundCompanyData) {
  debug.log('foundCompany', { user, foundCompanyData });
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '您並非金融管理會委員，無法進行此操作！');
  }
  const companyId = foundCompanyData._id;
  const oldFoundCompanyData = dbFoundations.findOne(companyId, {
    fields: {
      _id: 1,
      manager: 1,
      pictureBig: 1,
      pictureSmall: 1
    }
  });
  if (! oldFoundCompanyData) {
    throw new Meteor.Error(404, '找不到要編輯的新創計劃，該新創計劃可能已經創立成功或失敗！');
  }
  if (oldFoundCompanyData.pictureBig && oldFoundCompanyData.pictureBig !== foundCompanyData.pictureBig) {
    checkImageUrl(foundCompanyData.pictureBig);
  }
  if (oldFoundCompanyData.pictureSmall && oldFoundCompanyData.pictureSmall !== foundCompanyData.pictureSmall) {
    checkImageUrl(foundCompanyData.pictureSmall);
  }
  resourceManager.throwErrorIsResourceIsLock(['foundation' + companyId]);
  // 先鎖定資源，再更新
  resourceManager.request('editFoundCompany', ['foundation' + companyId], (release) => {
    dbFoundations.update(companyId, {
      $set: _.omit(foundCompanyData, '_id')
    });
    release();
  });
}
// 一分鐘最多三次
limitMethod('editFoundCompany', 3);
