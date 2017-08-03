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
      pictureSmall: new Match.Maybe(String),
      pictureBig: new Match.Maybe(String),
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
  editFoundCompany(foundCompanyData) {
    check(this.userId, String);
    check(foundCompanyData, {
      _id: String,
      companyName: String,
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
  const oldFoundCompanyData = dbFoundations.findOne(foundCompanyData._id);
  if (! oldFoundCompanyData) {
    throw new Meteor.Error(404, '找不到要編輯的新創計劃，該新創計劃可能已經創立成功或失敗！');
  }
  if (user.username !== oldFoundCompanyData.manager) {
    throw new Meteor.Error(401, '並非該新創計劃的發起人，無法編輯該新創計劃！');
  }
  const companyName = foundCompanyData.companyName;
  if (dbCompanies.findOne({companyName})) {
    throw new Meteor.Error(403, '已有相同名稱的公司上市，無法創立同名公司！');
  }
  const existsSameNameFoundCompanyData = dbFoundations.findOne({
    _id: {
      $ne: oldFoundCompanyData._id
    },
    companyName: companyName
  });
  if (existsSameNameFoundCompanyData) {
    throw new Meteor.Error(403, '已有相同名稱的公司正在創立中，無法創立同名公司！');
  }
  const unlock = lockManager.lock([user._id, companyName]);
  dbFoundations.update(foundCompanyData._id, {
    $set: _.omit(foundCompanyData, '_id')
  });
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

Meteor.publish('foundationPlan', function(keyword, offset) {
  check(keyword, String);
  check(offset, Match.Integer);
  const filter = {};
  if (keyword) {
    keyword = keyword.replace(/\\/g, '\\\\');
    const reg = new RegExp(keyword, 'i');
    filter.$or =[
      {
        companyName: reg
      },
      {
        manager: reg
      },
      {
        tags: reg
      }
    ];
  }

  return dbFoundations.find(filter, {
    sort: {
      createdAt: 1
    },
    skip: offset,
    limit: 10 + offset,
    fields: {
      pictureBig: 0
    }
  });
});

Meteor.publish('foundationPlanById', function(foundationId) {
  check(foundationId, String);

  return dbFoundations.find(foundationId);
});
