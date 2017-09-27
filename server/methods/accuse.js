'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { dbAdvertising } from '../../db/dbAdvertising';
import { dbCompanies } from '../../db/dbCompanies';
import { dbDirectors } from '../../db/dbDirectors';
import { dbFoundations } from '../../db/dbFoundations';
import { dbProducts } from '../../db/dbProducts';
import { dbProductLike } from '../../db/dbProductLike';
import { dbLog, accuseLogTypeList } from '../../db/dbLog';
import { dbSeason } from '../../db/dbSeason';
import { banTypeList } from '../../db/users';
import { limitSubscription } from './rateLimit';
import { debug } from '../debug';

Meteor.methods({
  accuseUser(userId, message) {
    check(this.userId, String);
    check(userId, String);
    check(message, String);
    accuseUser(Meteor.user(), userId, message);

    return true;
  }
});
function accuseUser(user, userId, message) {
  debug.log('accuseUser', {user, userId, message});
  if (_.contains(user.profile.ban, 'accuse')) {
    throw new Meteor.Error(403, '您現在被金融管理會禁止了所有舉報違規行為！');
  }
  const accuseUserData = Meteor.users.findOne(userId, {
    fields: {
      'status.lastLogin.ipAddr': 1
    }
  });
  if (! accuseUserData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + userId + '」的使用者！');
  }
  dbLog.insert({
    logType: '舉報違規',
    userId: [user._id, userId, accuseUserData.status.lastLogin.ipAddr],
    message: message,
    createdAt: new Date()
  });
}

Meteor.methods({
  accuseCompany(companyId, message) {
    check(this.userId, String);
    check(companyId, String);
    check(message, String);
    accuseCompany(Meteor.user(), companyId, message);

    return true;
  }
});
function accuseCompany(user, companyId, message) {
  debug.log('accuseCompany', {user, companyId, message});
  if (_.contains(user.profile.ban, 'accuse')) {
    throw new Meteor.Error(403, '您現在被金融管理會禁止了所有舉報違規行為！');
  }
  if (dbCompanies.find(companyId).count() < 1) {
    throw new Meteor.Error(404, '找不到識別碼為「' + companyId + '」的公司！');
  }
  dbLog.insert({
    logType: '舉報違規',
    userId: [user._id],
    companyId: companyId,
    message: message,
    createdAt: new Date()
  });
}

Meteor.methods({
  accuseProduct(productId, message) {
    check(this.userId, String);
    check(productId, String);
    check(message, String);
    accuseProduct(Meteor.user(), productId, message);

    return true;
  }
});
function accuseProduct(user, productId, message) {
  debug.log('accuseProduct', {user, productId, message});
  if (_.contains(user.profile.ban, 'accuse')) {
    throw new Meteor.Error(403, '您現在被金融管理會禁止了所有舉報違規行為！');
  }
  const productData = dbProducts.findOne(productId, {
    fields: {
      _id: 1,
      companyId: 1
    }
  });
  if (! productData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + productId + '」的公司！');
  }
  dbLog.insert({
    logType: '舉報違規',
    userId: [user._id],
    companyId: productData.companyId,
    productId: productId,
    message: message,
    createdAt: new Date()
  });
}

Meteor.methods({
  banUser({userId, message, banType}) {
    check(this.userId, String);
    check(userId, String);
    check(message, String);
    check(banType, new Match.OneOf(...banTypeList));
    banUser(Meteor.user(), {userId, message, banType});

    return true;
  }
});
function banUser(user, {userId, message, banType}) {
  debug.log('banUser', {user, userId, message, banType});
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '您並非金融管理會委員，無法進行此操作！');
  }
  const accuseUserData = Meteor.users.findOne(userId, {
    fields: {
      _id: 1,
      'profile.ban': 1
    }
  });
  if (! accuseUserData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + userId + '」的使用者！');
  }
  const oldBanList = accuseUserData.profile.ban;
  let logType;
  let newBanList;
  if (_.contains(oldBanList, banType)) {
    newBanList = _.without(oldBanList, banType);
    switch (banType) {
      case 'accuse': {
        logType = '解除舉報';
        break;
      }
      case 'deal': {
        logType = '解除下單';
        break;
      }
      case 'chat': {
        logType = '解除聊天';
        break;
      }
      case 'advertise': {
        logType = '解除廣告';
        break;
      }
      case 'manager': {
        logType = '解除禁任';
        break;
      }
    }
  }
  else {
    newBanList = _.union(oldBanList, [banType]);
    switch (banType) {
      case 'accuse': {
        logType = '禁止舉報';
        break;
      }
      case 'deal': {
        logType = '禁止下單';
        break;
      }
      case 'chat': {
        logType = '禁止聊天';
        break;
      }
      case 'advertise': {
        logType = '禁止廣告';
        break;
      }
      case 'manager': {
        logType = '禁任經理';
        dbCompanies
          .find(
            {
              $or: [
                {
                  manager: userId
                },
                {
                  candidateList: userId
                }
              ]
            },
            {
              fields: {
                _id: 1,
                manager: 1,
                candidateList: 1,
                voteList: 1
              }
            }
          )
          .forEach((companyData) => {
            dbLog.insert({
              logType: '撤職紀錄',
              userId: [user._id, userId],
              companyId: companyData._id,
              createdAt: new Date()
            });
            const manager = (companyData.manager === userId ? '!none' : companyData.manager);
            const candidateList = companyData.candidateList;
            const voteList = companyData.voteList;
            const candidateIndex = _.indexOf(candidateList, userId);
            if (candidateIndex !== -1) {
              candidateList.splice(candidateIndex, 1);
              voteList.splice(candidateIndex, 1);
            }
            dbCompanies.update(companyData._id, {
              $set: {
                manager: manager,
                candidateList: candidateList,
                voteList: voteList
              }
            });
          });
        dbFoundations.update(
          {
            manager: userId
          },
          {
            $set: {
              manager: '!none'
            }
          }
        );

        break;
      }
    }
  }
  if (logType && newBanList) {
    Meteor.users.update(userId, {
      $set: {
        'profile.ban': newBanList
      }
    });
    dbLog.insert({
      logType: logType,
      userId: [user._id, userId],
      message: message,
      createdAt: new Date()
    });
  }
}

Meteor.methods({
  forfeit({userId, message, amount}) {
    check(this.userId, String);
    check(userId, String);
    check(message, String);
    check(amount, Match.Integer);
    forfeit(Meteor.user(), {userId, message, amount});

    return true;
  }
});
function forfeit(user, {userId, message, amount}) {
  debug.log('forfeit', {user, userId, message, amount});
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '您並非金融管理會委員，無法進行此操作！');
  }
  if (Meteor.users.find(userId).count() < 1) {
    throw new Meteor.Error(404, '找不到識別碼為「' + userId + '」的使用者！');
  }
  amount *= -1;
  if (amount < 0) {
    dbLog.insert({
      logType: '課以罰款',
      userId: [user._id, userId],
      message: message,
      amount: amount * -1,
      createdAt: new Date()
    });
  }
  else {
    dbLog.insert({
      logType: '退還罰款',
      userId: [user._id, userId],
      message: message,
      amount: amount,
      createdAt: new Date()
    });
  }
  Meteor.users.update(userId, {
    $inc: {
      'profile.money': amount
    }
  });
}

Meteor.methods({
  confiscateStocks({userId, message}) {
    check(this.userId, String);
    check(userId, String);
    check(message, String);
    confiscateStocks(Meteor.user(), {userId, message});

    return true;
  }
});
function confiscateStocks(user, {userId, message}) {
  debug.log('confiscateStocks', {user, userId, message});
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '您並非金融管理會委員，無法進行此操作！');
  }
  if (Meteor.users.find(userId).count() < 1) {
    throw new Meteor.Error(404, '找不到識別碼為「' + userId + '」的使用者！');
  }
  const cursor = dbDirectors.find({userId});
  if (cursor.count() < 1) {
    return true;
  }
  const directorsBulk = dbDirectors.rawCollection().initializeUnorderedBulkOp();
  const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
  const createdAt = new Date();
  cursor.forEach((directorData) => {
    const {companyId, stocks} = directorData;
    logBulk.insert({
      logType: '沒收股份',
      userId: [user._id, userId],
      companyId: companyId,
      amount: stocks,
      message: message,
      createdAt: createdAt
    });
    if (dbDirectors.find({companyId, userId: '!FSC'}).count() > 0) {
      //由於directors主鍵為Mongo Object ID，在Bulk進行find會有問題，故以companyId+userId進行搜尋更新
      directorsBulk
        .find({companyId, userId: '!FSC'})
        .updateOne({
          $inc: {
            stocks: stocks
          }
        });
    }
    else {
      directorsBulk.insert({
        companyId: companyId,
        userId: '!FSC',
        stocks: stocks,
        createdAt: createdAt
      });
    }
  });
  logBulk.execute();
  directorsBulk.execute();
  dbDirectors.remove({userId});

  return  true;
}

Meteor.methods({
  sealCompany({companyId, message}) {
    check(this.userId, String);
    check(companyId, String);
    check(message, String);
    sealCompany(Meteor.user(), {companyId, message});

    return true;
  }
});
function sealCompany(user, {companyId, message}) {
  debug.log('sealCompany', {user, companyId, message});
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '您並非金融管理會委員，無法進行此操作！');
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
    dbLog.insert({
      logType: '解除查封',
      userId: [user._id],
      companyId: companyId,
      message: message,
      createdAt: new Date()
    });
    dbCompanies.update(companyId, {
      $set: {
        isSeal: false
      }
    });
  }
  else {
    dbLog.insert({
      logType: '查封關停',
      userId: [user._id],
      companyId: companyId,
      message: message,
      createdAt: new Date()
    });
    dbCompanies.update(companyId, {
      $set: {
        isSeal: true
      }
    });
  }
}

Meteor.methods({
  takeDownProduct({productId, message}) {
    check(this.userId, String);
    check(productId, String);
    check(message, String);
    takeDownProduct(Meteor.user(), {productId, message});

    return true;
  }
});
function takeDownProduct(user, {productId, message}) {
  debug.log('takeDownProduct', {user, productId, message});
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '您並非金融管理會委員，無法進行此操作！');
  }
  const productData = dbProducts.findOne(productId);
  if (! productData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + productId + '」的產品，該產品可能已被下架！');
  }
  const companyId = productData.companyId;
  const seasonData = dbSeason.findOne({}, {
    sort: {
      beginDate: -1
    }
  });
  if (productData.overdue === 1 && seasonData) {
    const votePrice = seasonData.votePrice;
    const voteProfit = productData.votes * votePrice;
    dbCompanies.update(companyId, {
      $inc: {
        profit: voteProfit * -1
      }
    });
    dbLog.insert({
      logType: '產品下架',
      userId: [user._id],
      companyId: companyId,
      productId: productId,
      price: voteProfit,
      message: message,
      createdAt: new Date()
    });
  }
  else {
    dbLog.insert({
      logType: '產品下架',
      userId: [user._id],
      companyId: companyId,
      productId: productId,
      message: message,
      createdAt: new Date()
    });
  }
  dbProducts.remove(productId);
  dbProductLike.remove({productId});
}

Meteor.methods({
  takeDownAdvertising(advertisingId) {
    check(this.userId, String);
    check(advertisingId, String);
    takeDownAdvertising(Meteor.user(), advertisingId);

    return true;
  }
});
function takeDownAdvertising(user, advertisingId) {
  debug.log('takeDownAdvertising', {user, advertisingId});
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '您並非金融管理會委員，無法進行此操作！');
  }
  const advertisingData = dbAdvertising.findOne(advertisingId);
  if (! advertisingData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + advertisingId + '」的廣告！');
  }
  dbLog.insert({
    logType: '撤銷廣告',
    userId: [user._id, advertisingData.userId],
    message: advertisingData.message,
    createdAt: new Date()
  });
  dbAdvertising.remove(advertisingId);
}

Meteor.publish('accuseRecord', function(offset) {
  debug.log('publish accuseRecord', offset);
  check(offset, Match.Integer);

  let initialized = false;
  let total = dbLog
    .find({
      logType: {
        $in: accuseLogTypeList
      }
    })
    .count();
  this.added('variables', 'totalCountOfAccuseRecord', {
    value: total
  });

  const observer = dbLog
    .find(
      {
        logType: {
          $in: accuseLogTypeList
        }
      },
      {
        sort: {
          createdAt: -1
        },
        skip: offset,
        limit: 30,
        disableOplog: true
      }
    )
    .observeChanges({
      added: (id, fields) => {
        this.added('log', id, fields);
        if (initialized) {
          total += 1;
          this.changed('variables', 'totalCountOfAccuseRecord', {
            value: total
          });
        }
      },
      removed: (id) => {
        this.removed('log', id);
        if (initialized) {
          total -= 1;
          this.changed('variables', 'totalCountOfAccuseRecord', {
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
//一分鐘最多重複訂閱10次
limitSubscription('accuseRecord', 10);
