'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { dbCompanies } from '../../db/dbCompanies';
import { dbEmployees } from '../../db/dbEmployees';
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
  if (user.profile.notPayTax) {
    throw new Meteor.Error(403, '您現在有稅單逾期未繳！');
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

