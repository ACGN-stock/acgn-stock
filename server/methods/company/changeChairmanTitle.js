import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbCompanies } from '/db/dbCompanies';
import { limitMethod } from '/server/imports/rateLimit';
import { debug } from '/server/imports/debug';

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
  debug.log('changeChairmanTitle', {user, companyId, chairmanTitle});
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
