import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { dbEmployees } from '/db/dbEmployees';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  registerEmployee(companyId) {
    check(this.userId, String);
    check(companyId, String);
    registerEmployee(Meteor.user(), companyId);

    return true;
  }
});
export function registerEmployee(user, companyId) {
  debug.log('registerEmployee', { user, companyId });
  if (user.profile.isInVacation) {
    throw new Meteor.Error(403, '您現在正在渡假中，請好好放鬆！');
  }
  if (_.contains(user.profile.ban, 'deal')) {
    throw new Meteor.Error(403, '您現在被金融管理會禁止了所有投資下單行為！');
  }
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      companyName: 1,
      isSeal: 1
    }
  });
  if (! companyData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + companyId + '」的公司！');
  }
  if (companyData.isSeal) {
    throw new Meteor.Error(403, '「' + companyData.companyName + '」公司已被金融管理委員會查封關停了！');
  }

  const userId = user._id;
  const employed = false;
  const resigned = false;
  const registerAt = new Date();
  dbEmployees.remove({ userId, employed, resigned });
  dbEmployees.insert({ companyId, userId, registerAt });
}
limitMethod('registerEmployee');
