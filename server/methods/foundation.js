'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { resourceManager } from '../resourceManager';
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
  if (dbFoundations.find({companyName}).count() > 0 || dbCompanies.find({companyName}).count() > 0) {
    throw new Meteor.Error(403, '已有相同名稱的公司上市或創立中，無法創立同名公司！');
  }
  foundCompanyData.manager = user.username;
  foundCompanyData.createdAt = new Date();
  dbLog.insert({
    logType: '創立公司',
    username: [user.username],
    companyName: companyName,
    createdAt: new Date()
  });
  dbFoundations.insert(foundCompanyData);
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
  const oldFoundCompanyData = dbFoundations.findOne(foundCompanyData._id, {
    fields: {
      _id: 1,
      manager: 1
    }
  });
  if (! oldFoundCompanyData) {
    throw new Meteor.Error(404, '找不到要編輯的新創計劃，該新創計劃可能已經創立成功或失敗！');
  }
  if (user.username !== oldFoundCompanyData.manager) {
    throw new Meteor.Error(401, '並非該新創計劃的發起人，無法編輯該新創計劃！');
  }
  const companyName = foundCompanyData.companyName;
  if (dbCompanies.find({companyName}).count()) {
    throw new Meteor.Error(403, '已有相同名稱的公司上市，無法創立同名公司！');
  }
  const existsSameNameFoundCompanies = dbFoundations
    .find({
      _id: {
        $ne: oldFoundCompanyData._id
      },
      companyName: companyName
    })
    .count();
  if (existsSameNameFoundCompanies.length > 0) {
    throw new Meteor.Error(403, '已有相同名稱的公司正在創立中，無法創立同名公司！');
  }
  resourceManager.throwErrorIsResourceIsLock(['foundation' + companyName]);
  //先鎖定資源，再更新
  resourceManager.request('editFoundCompany', ['foundation' + companyName], (release) => {
    dbFoundations.update(foundCompanyData._id, {
      $set: _.omit(foundCompanyData, '_id')
    });
    release();
  });
}

Meteor.methods({
  investFoundCompany(companyName, amount) {
    check(this.userId, String);
    check(companyName, String);
    check(amount, Match.Integer);
    investFoundCompany(Meteor.user(), companyName, amount);

    return true;
  }
});

export function investFoundCompany(user, companyName, amount) {
  const minimumInvest = Math.ceil(config.minReleaseStock / config.foundationNeedUsers);
  if (amount < minimumInvest) {
    throw new Meteor.Error(403, '最低投資金額為' + minimumInvest + '！');
  }
  if (user.profile.money < amount) {
    throw new Meteor.Error(403, '金錢不足，無法投資！');
  }
  const foundCompanyData = dbFoundations.find({companyName}).count();
  if (foundCompanyData.length < 1) {
    throw new Meteor.Error(404, '創立計劃並不存在，可能已經上市或被撤銷！');
  }
  const username = user.username;
  //先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.throwErrorIsResourceIsLock(['foundation' + companyName, 'user' + username]);
  resourceManager.request('investFoundCompany', ['foundation' + companyName, 'user' + username], (release) => {
    const user = Meteor.users.findOne({username});
    if (user.profile.money < amount) {
      throw new Meteor.Error(403, '金錢不足，無法投資！');
    }
    const foundCompanyData = dbFoundations.findOne({companyName}, {
      fields: {
        _id: 1,
        invest: 1
      }
    });
    if (! foundCompanyData) {
      throw new Meteor.Error(404, '創立計劃並不存在，可能已經上市或被撤銷！');
    }
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
      companyName: companyName,
      amount: amount,
      createdAt: new Date()
    });
    Meteor.users.update(user._id, {
      $inc: {
        'profile.money': amount * -1
      }
    });
    dbFoundations.update(foundCompanyData._id, {
      $set: {
        invest: invest
      }
    });
    release();
  });
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

  let initialized = false;
  let total = dbFoundations.find(filter).count();
  this.added('variables', 'totalCountOfFoundationPlan', {
    value: total
  });

  const observer = dbFoundations
    .find(filter, {
      sort: {
        createdAt: 1
      },
      skip: offset,
      limit: 10,
      fields: {
        pictureBig: 0
      }
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('foundations', id, fields);
        if (initialized) {
          total += 1;
          this.changed('variables', 'totalCountOfFoundationPlan', {
            value: total
          });
        }
      },
      changed: (id, fields) => {
        this.changed('foundations', id, fields);
      },
      removed: (id) => {
        this.removed('foundations', id);
        if (initialized) {
          total -= 1;
          this.changed('variables', 'totalCountOfFoundationPlan', {
            value: total
          });
        }
      }
    });
  initialized = true;
  this.ready();
  this.onStop(() => {
    observer.stop();
  });
});

Meteor.publish('foundationPlanById', function(foundationId) {
  check(foundationId, String);

  return dbFoundations.find(foundationId);
});
