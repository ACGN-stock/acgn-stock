'use strict';
import url from 'url';
import querystring from 'querystring';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
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
  const userId = user._id;
  foundCompanyData.manager = userId;
  foundCompanyData.createdAt = new Date();
  dbLog.insert({
    logType: '創立公司',
    userId: [userId],
    message: companyName,
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
  const companyId = foundCompanyData._id;
  const oldFoundCompanyData = dbFoundations.findOne(companyId, {
    fields: {
      _id: 1,
      manager: 1
    }
  });
  if (! oldFoundCompanyData) {
    throw new Meteor.Error(404, '找不到要編輯的新創計劃，該新創計劃可能已經創立成功或失敗！');
  }
  if (user._id !== oldFoundCompanyData.manager) {
    throw new Meteor.Error(401, '並非該新創計劃的發起人，無法編輯該新創計劃！');
  }
  const companyName = foundCompanyData.companyName;
  if (dbCompanies.find({companyName}).count()) {
    throw new Meteor.Error(403, '已有相同名稱的公司上市，無法創立同名公司！');
  }
  const sameCompanyNameCompaniesCursor = dbFoundations
    .find({
      _id: {
        $ne: companyId
      },
      companyName: companyName
    });
  if (sameCompanyNameCompaniesCursor.count() > 0) {
    throw new Meteor.Error(403, '已有相同名稱的公司正在創立中，無法創立同名公司！');
  }
  resourceManager.throwErrorIsResourceIsLock(['foundation' + companyId]);
  //先鎖定資源，再更新
  resourceManager.request('editFoundCompany', ['foundation' + companyId], (release) => {
    dbFoundations.update(companyId, {
      $set: _.omit(foundCompanyData, '_id')
    });
    release();
  });
}

Meteor.methods({
  investFoundCompany(companyId, amount) {
    check(this.userId, String);
    check(companyId, String);
    check(amount, Match.Integer);
    investFoundCompany(Meteor.user(), companyId, amount);

    return true;
  }
});
export function investFoundCompany(user, companyId, amount) {
  const minimumInvest = Math.ceil(config.minReleaseStock / config.foundationNeedUsers);
  if (amount < minimumInvest) {
    throw new Meteor.Error(403, '最低投資金額為' + minimumInvest + '！');
  }
  if (user.profile.money < amount) {
    throw new Meteor.Error(403, '金錢不足，無法投資！');
  }
  const foundCompanyData = dbFoundations.find(companyId).count();
  if (foundCompanyData.length < 1) {
    throw new Meteor.Error(404, '創立計劃並不存在，可能已經上市或被撤銷！');
  }
  const userId = user._id;
  //先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.throwErrorIsResourceIsLock(['foundation' + companyId, 'user' + userId]);
  resourceManager.request('investFoundCompany', ['foundation' + companyId, 'user' + userId], (release) => {
    const user = Meteor.users.findOne(userId, {
      fields: {
        profile: 1
      }
    });
    if (user.profile.money < amount) {
      throw new Meteor.Error(403, '金錢不足，無法投資！');
    }
    const foundCompanyData = dbFoundations.findOne(companyId, {
      fields: {
        _id: 1,
        companyName: 1,
        invest: 1
      }
    });
    if (! foundCompanyData) {
      throw new Meteor.Error(404, '創立計劃並不存在，可能已經上市或被撤銷！');
    }
    const invest = foundCompanyData.invest;
    const existsInvest = _.findWhere(invest, {userId});
    if (existsInvest) {
      existsInvest.amount += amount;
    }
    else {
      invest.push({userId, amount});
    }
    dbLog.insert({
      logType: '參與投資',
      userId: [userId],
      message: foundCompanyData.companyName,
      amount: amount,
      resolve: false,
      createdAt: new Date()
    });
    Meteor.users.update(userId, {
      $inc: {
        'profile.money': amount * -1
      }
    });
    dbFoundations.update(companyId, {
      $set: {
        invest: invest
      }
    });
    release();
  });
}

//以Ajax方式發布圖片
WebApp.connectHandlers.use(function(req, res, next) {
  const parsedUrl = url.parse(req.url);
  if (parsedUrl.pathname === '/foundationPicture') {
    const query = querystring.parse(parsedUrl.query);
    const companyId = query.id;
    const foundationData = dbFoundations.findOne(companyId, {
      fields: {
        pictureSmall: 1
      }
    });
    if (foundationData) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.end(foundationData.pictureSmall || '');
    }
    else {
      res.writeHead(404, {
        'Content-Type': 'text/plain'
      });
      res.write('404 Not Found\n');
      res.end();
    }
  }
  else {
    next();
  }
});

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
      fields: {
        tags: 0,
        pictureSmall: 0,
        pictureBig: 0
      },
      sort: {
        createdAt: 1
      },
      skip: offset,
      limit: 10,
      disableOplog: true
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

Meteor.publish('foundationDataForEdit', function(foundationId) {
  check(foundationId, String);

  return dbFoundations.find(foundationId, {
    fields: {
      pictureSmall: 0,
      pictureBig: 0
    }
  });
});
