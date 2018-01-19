import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { dbSeason } from '/db/dbSeason';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  updateNextSeasonSalary(companyId, salary) {
    check(this.userId, String);
    check(companyId, String);
    check(salary, Match.Integer);
    updateNextSeasonSalary(Meteor.user(), companyId, salary);

    return true;
  }
});
export function updateNextSeasonSalary(user, companyId, salary) {
  debug.log('updateNextSeasonSalary', { user, companyId, salary });
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      companyName: 1,
      manager: 1,
      isSeal: 1
    }
  });

  if (companyData.manager !== '!none' && user._id !== companyData.manager) {
    throw new Meteor.Error(401, '使用者並非該公司的經理人！');
  }
  if (companyData.isSeal) {
    throw new Meteor.Error(403, '「' + companyData.companyName + '」公司已被金融管理委員會查封關停了！');
  }
  if (salary < Meteor.settings.public.minimumCompanySalaryPerDay || salary > Meteor.settings.public.maximumCompanySalaryPerDay) {
    throw new Meteor.Error(403, '不正確的薪資設定！');
  }

  const seasonData = dbSeason
    .findOne({}, {
      sort: {
        beginDate: -1
      }
    });
  if (! seasonData) {
    throw new Meteor.Error(500, '商業季度尚未開始！');
  }
  if (Date.now() >= seasonData.endDate.getTime() - Meteor.settings.public.announceSalaryTime) {
    const hour = Meteor.settings.public.announceSalaryTime / 1000 / 60 / 60;
    throw new Meteor.Error(403, `季度結束前${hour}小時不可更改薪資！`);
  }

  dbCompanies.update(companyId, {
    $set: {
      nextSeasonSalary: salary
    }
  });
}
limitMethod('updateNextSeasonSalary');
