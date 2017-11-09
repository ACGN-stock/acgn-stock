'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { dbCompanies } from '../../db/dbCompanies';
import { dbEmployees } from '../../db/dbEmployees';
import { dbSeason } from '../../db/dbSeason';
import { limitMethod, limitSubscription } from './rateLimit';
import { debug } from '../debug';

Meteor.methods({
  registerEmployee(companyId) {
    check(this.userId, String);
    check(companyId, String);
    registerEmployee(Meteor.user(), companyId);

    return true;
  }
});
export function registerEmployee(user, companyId) {
  debug.log('registerEmployee', {user, companyId});
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
  dbEmployees.remove({userId, employed, resigned});
  dbEmployees.insert({companyId, userId, registerAt});
}
limitMethod('registerEmployee');

Meteor.methods({
  unregisterEmployee() {
    check(this.userId, String);
    unregisterEmployee(Meteor.user());

    return true;
  }
});
export function unregisterEmployee(user) {
  debug.log('unregisterEmployee', {user});
  const userId = user._id;
  const employed = false;
  const resigned = false;
  dbEmployees.remove({userId, employed, resigned});
}
limitMethod('unregisterEmployee');

Meteor.methods({
  updateSeasonalBonus(companyId, percentage) {
    check(this.userId, String);
    check(companyId, String);
    check(percentage, Match.Integer);
    updateSeasonalBonus(Meteor.user(), companyId, percentage);

    return true;
  }
});
export function updateSeasonalBonus(user, companyId, percentage) {
  debug.log('updateSeasonalBonus', {user, companyId, percentage});
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
  if (percentage < Meteor.settings.public.minimumSeasonalBonusPercent || percentage > Meteor.settings.public.maximumSeasonalBonusPercent) {
    throw new Meteor.Error(403, '不正確的分紅設定！');
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
  if (Date.now() >= seasonData.endDate.getTime() - Meteor.settings.public.announceBonusTime) {
    const hour = Meteor.settings.public.announceBonusTime / 1000 / 60 / 60;
    throw new Meteor.Error(403, `季度結束前${hour}小時不可更改分紅！`);
  }

  dbCompanies.update(companyId, {
    $set: {
      seasonalBonusPercent: percentage
    }
  });
}
limitMethod('updateSeasonalBonus');

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
  debug.log('updateNextSeasonSalary', {user, companyId, salary});
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

Meteor.publish('employeeListByCompany', function(companyId) {
  debug.log('publish employeeListByCompany', {companyId});
  check(companyId, String);
  const resigned = false;

  return dbEmployees.find({companyId, resigned});
});
//一分鐘最多20次
limitSubscription('employeeListByCompany');

Meteor.publish('employeeListByUser', function(userId) {
  debug.log('publish employeeListByUser', {userId});
  check(userId, String);
  const resigned = false;

  return dbEmployees.find({userId, resigned});
});
//一分鐘最多20次
limitSubscription('employeeListByUser');

