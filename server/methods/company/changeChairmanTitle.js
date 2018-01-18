import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbCompanies } from '/db/dbCompanies';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  changeChairmanTitle(companyId, chairmanTitle) {
    check(this.userId, String);
    check(companyId, String);
    check(chairmanTitle, String);
    changeChairmanTitle(Meteor.user(), companyId, chairmanTitle);

    return true;
  }
});
function changeChairmanTitle(user, companyId, chairmanTitle) {
  debug.log('changeChairmanTitle', { user, companyId, chairmanTitle });
  if (user.profile.isInVacation) {
    throw new Meteor.Error(403, '您現在正在渡假中，請好好放鬆！');
  }
  const userId = user._id;
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      chairman: 1
    }
  });
  if (! companyData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + companyId + '」的公司！');
  }
  if (companyData.chairman !== userId) {
    throw new Meteor.Error(401, '使用者並非該公司的董事長，無法修改董事長頭銜！');
  }
  dbCompanies.update(companyId, {
    $set: {
      chairmanTitle: chairmanTitle
    }
  });
}
limitMethod('changeChairmanTitle');
