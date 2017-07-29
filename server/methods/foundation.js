'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { lockManager } from '../../lockManager';
import { dbFoundations } from '../../db/dbFoundations';
import { dbLog } from '../../db/dbLog';
import { dbCompanies } from '../../db/dbCompanies';
import { config } from '../../config';

Meteor.methods({
  foundCompany(foundCompanyData) {
    check(this.userId, String);
    check(foundCompanyData, {
      companyName: String,
      tags: [String],
      puctureSmall: new Match.Optional(String),
      puctureBig: new Match.Optional(String),
      description: String
    });
    foundCompany(Meteor.user(), foundCompanyData);

    return true;
  }
});

export function foundCompany(user, foundCompanyData) {
  const companyName = foundCompanyData.companyName;
  if (dbFoundations.findOne({companyName}) || dbCompanies.findOne({companyName})) {
    throw new Meteor.Error(403, '已有相同名稱的公司上市或創立中，無法創立同名公司！');
  }
  const unlock = lockManager.lock([user._id, companyName]);
  foundCompanyData.manager = user.username;
  foundCompanyData.createdAt = new Date();
  dbLog.insert({
    logType: '創立公司',
    username: [user.username],
    companyName: companyName,
    createdAt: new Date()
  });
  dbFoundations.insert(foundCompanyData);
  unlock();
}

Meteor.methods({
  investFoundCompany(foundCompanyId, amount) {
    check(this.userId, String);
    check(foundCompanyId, String);
    check(amount, Match.Integer);
    investFoundCompany(Meteor.user(), foundCompanyId, amount);

    return true;
  }
});

export function investFoundCompany(user, foundCompanyId, amount) {
  const minimumInvest = Math.ceil(config.beginReleaseStock / config.foundationNeedUsers);
  if (amount < minimumInvest) {
    throw new Meteor.Error(403, '最低投資金額為' + minimumInvest + '！');
  }
  const foundCompanyData = dbFoundations.findOne(foundCompanyId);
  if (! foundCompanyData) {
    throw new Meteor.Error(404, '創立計劃並不存在，可能已經上市或被撤銷！');
  }
  if (user.profile.money < amount) {
    throw new Meteor.Error(403, '金錢不足，無法投資！');
  }
  const unlock = lockManager.lock([user._id, foundCompanyData.companyName]);
  const username = user.username;
  const invest = foundCompanyData.invest;
  const existsInvest = _.findWhere(invest, {username});
  if (existsInvest) {
    existsInvest.amount += amount;
  }
  else {
    invest.push({username, amount});
  }
  dbLog.insert({
    logType: '參與投資',
    username: [username],
    companyName: foundCompanyData.companyName,
    amount: amount,
    createdAt: new Date()
  });
  Meteor.users.update({
    _id: user._id
  }, {
    $inc: {
      'profile.money': amount * -1
    }
  });
  dbFoundations.update({
    _id: foundCompanyId
  }, {
    $set: {invest}
  });
  unlock();
}

Meteor.publish('foundationPlan', function() {
  check(this.userId, String);

  return dbFoundations.find();
});
