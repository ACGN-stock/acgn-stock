'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { dbCompanies } from '../../db/dbCompanies';
import { dbProducts } from '../../db/dbProducts';
import { dbLog, accuseLogTypeList } from '../../db/dbLog';
import { banTypeList } from '../../db/users';

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

Meteor.publish('accuseRecord', function(offset) {
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
