import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbFoundations } from '/db/dbFoundations';
import { checkImageUrl } from '/server/imports/utils/checkImageUrl';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { resourceManager } from '/server/imports/threading/resourceManager';
import { guardUser } from '/common/imports/guards';

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

  guardUser(user).checkHasRole('fscMember');

  const { _id: companyId } = foundCompanyData;

  const oldFoundCompanyData = dbFoundations.findByIdOrThrow(companyId, {
    fields: {
      manager: 1,
      pictureBig: 1,
      pictureSmall: 1
    }
  });

  if (oldFoundCompanyData.pictureBig && oldFoundCompanyData.pictureBig !== foundCompanyData.pictureBig) {
    checkImageUrl(foundCompanyData.pictureBig);
  }

  if (oldFoundCompanyData.pictureSmall && oldFoundCompanyData.pictureSmall !== foundCompanyData.pictureSmall) {
    checkImageUrl(foundCompanyData.pictureSmall);
  }

  resourceManager.throwErrorIsResourceIsLock([`foundation${companyId}`]);
  // 先鎖定資源，再更新
  resourceManager.request('editFoundCompany', [`foundation${companyId}`], (release) => {
    dbFoundations.update(companyId, { $set: _.omit(foundCompanyData, '_id') });
    release();
  });
}
// 一分鐘最多三次
limitMethod('editFoundCompany', 3);
