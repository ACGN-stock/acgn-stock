import test from 'tape';
import sinon from 'sinon';
import deepequal from 'deep-equal';
import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { dbSeason } from '/db/dbSeason';
import { dbCompanies } from '/db/dbCompanies';
import { dbEmployees } from '/db/dbEmployees';

import { registerEmployee } from '/server/methods/employee/registerEmployee';
import { unregisterEmployee } from '/server/methods/employee/unregisterEmployee';
import { updateNextSeasonSalary } from '/server/methods/employee/updateNextSeasonSalary';

test('Register employee test', function(t) {
  _.contains.callsFake(function(arr, obj) {
    return arr.includes(obj);
  });

  const user = {
    _id: 'FOOBAR',
    profile: {
      ban: ['deal']
    }
  };

  const companyId = 'Foo_company';

  t.throws(function() {
    registerEmployee(user, companyId);
  }, Meteor.Error, 'User can\'t register as an employee when user is banned from dealing');

  user.profile.ban = [];
  dbCompanies.findOne.returns(undefined);

  t.throws(function() {
    registerEmployee(user, companyId);
  }, Meteor.Error, 'User can\'t register as an employee of the company which doesn\'t exist');

  dbCompanies.findOne.returns({ companyName: companyId, isSeal: true });

  t.throws(function() {
    registerEmployee(user, companyId);
  }, Meteor.Error, 'User can\'t register as an employee of the sealed company');

  dbCompanies.findOne.returns({ companyName: companyId, isSeal: false });

  const curDate = new Date();
  const clock = sinon.useFakeTimers(curDate);

  dbEmployees.remove.callsFake(function(obj) {
    if (obj.userId !== user._id)
      t.fail('Try to remove incorrect User id');
    if (obj.employed)
      t.fail('Try to remove employed user');
    if (obj.resigned)
      t.fail('Try to remove resigned user');
  });

  dbEmployees.insert.callsFake(function(obj) {
    if (obj.companyId !== companyId)
      t.fail('Try to register as an employee of the incorrect company');
    if (obj.userId !== user._id)
      t.fail('Incorrect user registers as an employee');
    if (obj.registerAt.getTime() !== curDate.getTime())
      t.fail('User registers at incorrect time');
  });

  registerEmployee(user, companyId);

  t.pass('User can register as an employee of the not sealed company');

  clock.restore();

  dbEmployees.remove.reset();
  dbEmployees.insert.reset();

  dbCompanies.findOne.reset();

  _.contains.reset();

  t.end();
});


test('Unregiser employee test', function(t) {
  const user = {
    _id: 'FOOBAR'
  };

  dbEmployees.remove.callsFake(function(obj) {
    if (obj.userId !== user._id)
      t.fail('Try to remove incorrect User id');
    if (obj.employed)
      t.fail('Try to remove employed user');
    if (obj.resigned)
      t.fail('Try to remove resigned user');
  });

  unregisterEmployee(user);

  t.pass('User can unregister as an employee');

  dbEmployees.remove.reset();

  t.end();
});

test('Update next season salary test', function(t) {
  const user = {
    _id: 'FooUser'
  };
  const companyId = 'FooCompany';
  const salary = Meteor.settings.minimumCompanySalaryPerDay;

  dbCompanies.findOne.returns({
    companyName: companyId,
    manager: 'FooManager'
  });

  t.throws(function() {
    updateNextSeasonSalary(user, companyId, salary);
  }, Meteor.Error, 'User who is not the manager of company can\'t update next season salary.');

  dbCompanies.findOne.returns({
    companyName: companyId,
    manager: user._id,
    isSeal: true
  });

  t.throws(function() {
    updateNextSeasonSalary(user, companyId, salary);
  }, Meteor.Error, 'Manager can\'t update next season salary of sealed company');

  dbCompanies.findOne.returns({
    companyName: companyId,
    manager: user._id,
    isSeal: false
  });

  t.throws(function() {
    updateNextSeasonSalary(user, companyId, Meteor.settings.maximumSalaryPerDay + 1);
  }, Meteor.Error, 'Manager can\'t set the salary over the range');

  dbSeason.findOne.returns(undefined);

  t.throws(function() {
    updateNextSeasonSalary(user, companyId, salary);
  }, Meteor.Error, 'Manager can\'t update next season salary when season has not started');

  const clock = sinon.useFakeTimers(new Date());
  let endTime = Date.now() + Meteor.settings.public.announceSalaryTime / 2;
  let beginTime = endTime - Meteor.settings.public.seasonTime;

  dbSeason.findOne.returns({
    beginDate: new Date(beginTime),
    endDate: new Date(endTime)
  });

  t.throws(function() {
    updateNextSeasonSalary(user, companyId, salary);
  }, Meteor.Error, 'Manager can\'t update next season salary when the salary-update deadline expires');

  endTime = Date.now() + Meteor.settings.public.announceSalaryTime * 2;
  beginTime = endTime - Meteor.settings.public.seasonTime;

  dbSeason.findOne.returns({
    beginDate: new Date(beginTime),
    endDate: new Date(endTime)
  });

  dbCompanies.update.callsFake(function(id, info) {
    if (id !== companyId)
      t.fail('Try to update salary on incorrect company');
    if (! deepequal(info, { $set: { nextSeasonSalary: salary } }, { strict: true }))
      t.fail('Try to update incorrect salary on company');
  });

  updateNextSeasonSalary(user, companyId, salary);

  t.pass('Manager can update next season salary except above conditions');

  clock.restore();

  dbCompanies.update.reset();
  dbCompanies.findOne.reset();
  dbSeason.findOne.reset();

  t.end();
});
