'use strict';
import cheerio from 'cheerio';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http'
import { check, Match } from 'meteor/check';
import { Accounts } from 'meteor/accounts-base';
import { UserStatus } from 'meteor/mizzao:user-status';
import { resourceManager } from '../resourceManager';
import { dbValidatingUsers } from '../../db/dbValidatingUsers';
import { dbCompanies } from '../../db/dbCompanies';
import { dbDirectors } from '../../db/dbDirectors';
import { dbLog } from '../../db/dbLog';
import { dbVariables } from '../../db/dbVariables';
import { config } from '../../config';
import { limitMethod, limitSubscription, limitGlobalMethod } from './rateLimit';
import { debug } from '../debug';

Meteor.methods({
  loginOrRegister(username, password, reset = false) {
    debug.log('loginOrRegister', {username, password, reset});
    check(username, String);
    check(password, String);

    if (Meteor.users.find({username}).count() > 0 && reset === false) {
      return true;
    }
    else {
      const existValidatingUser = dbValidatingUsers.findOne({username, password});
      let validateCode;
      if (existValidatingUser) {
        validateCode = existValidatingUser.validateCode;
      }
      else {
        validateCode = generateValidateCode();
        const createdAt = new Date();
        dbValidatingUsers.insert({username, password, validateCode, createdAt});
      }

      return validateCode;
    }
  }
});
//一分鐘最多五次
limitMethod('loginOrRegister', 5);
const randomStringList = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function generateValidateCode() {
  return _.sample(randomStringList, 10).join('');
}

Meteor.methods({
  validateAccount(username) {
    check(username, String);
    resourceManager.throwErrorIsResourceIsLock(['validateAccount']);
    //先鎖定資源，再重新讀取一次資料進行運算
    const result = validateUsers(username);
    if (result) {
      return true;
    }
    else if (Meteor.users.find({username}).count() > 0) {
      return true;
    }
    else {
      throw new Meteor.Error('[403] Forbidden', '驗證未能通過，請確定推文位置、推文文章、推文方式與推文驗證碼是否正確！');
    }
  }
});
limitGlobalMethod('validateAccount');
function validateUsers(checkUsername) {
  debug.log('validateUsers', checkUsername);
  let checkResult = false;
  const validatingUserList = dbValidatingUsers.find({}, {disableOplog: true}).fetch();
  if (validatingUserList.length > 0) {
    const url = dbVariables.get('validateUserUrl');
    const httpCallResult = HTTP.get(url);
    const $pushList = cheerio.load(httpCallResult.content)('div.push');
    validatingUserList.forEach((validatingUser) => {
      const username = validatingUser.username;
      const $userPushList = $pushList.find('.push-userid:contains(' + username + ')').closest('.push');
      if ($userPushList.length > 0) {
        const validateCode = validatingUser.validateCode;
        if ($userPushList.find('.push-content:contains(' + validateCode + ')').length > 0) {
          if (checkUsername === username) {
            checkResult = true;
          }
          const password = validatingUser.password;
          const existUser = Meteor.users.findOne({username}, {
            fields: {
              _id: 1
            }
          });
          if (existUser) {
            Accounts.setPassword(existUser._id, password, {
              logout: true
            });
            dbValidatingUsers.remove(validatingUser._id);
          }
          else {
            const profile = {
              name: username
            };
            Accounts.createUser({username, password, profile});
            dbValidatingUsers.remove(validatingUser._id);
          }
        }
      }
    });
  }

  return checkResult;
}

Meteor.methods({
  getAveragePrice(companyId, userId) {
    let cost = 0;
    let amount = 0;
    const foundLog = dbLog.findOne({
      logType: '創立得股',
      companyId: companyId,
      userId: {
        $in: [userId, '!all']
      }
    });
    if (foundLog) {
      cost = foundLog.price * foundLog.amount;
      amount = foundLog.amount;
    }

    dbLog.find({
      logType: '交易紀錄',
      companyId: companyId,
      userId: {
        $in: [userId, '!all']
      }
    }, {
      fields: {
        userId: 1,
        price: 1,
        amount: 1
      },
      sort: {
        createdAt: 1
      },
      disableOplog: true
    }).forEach(log => {
      if (log.userId[0] === userId) {
        //買入股票: 增加購入價格
        amount += log.amount;
        cost += log.price * log.amount;
      }
      else {
        //賣出股票: 扣除當前均價
        cost -= (cost / amount) * log.amount;
        amount -= log.amount;
      }
    });
    return cost / amount;    
  }
});

Accounts.onCreateUser((options, user) => {
  debug.log('onCreateUser', options);
  user.profile = _.defaults({}, options.profile, {
    money: config.beginMoney,
    vote: 0,
    stone: 0,
    isAdmin: false,
    ban: []
  });
  dbLog.insert({
    logType: '驗證通過',
    userId: [user._id],
    price: config.beginMoney,
    createdAt: new Date()
  });
  if (user.services && user.services.google) {
    const email = user.services.google.email;
    const gmailAccountNameEndIndex = email.indexOf('@');
    user.profile.name = email.slice(0, gmailAccountNameEndIndex);
  }

  return user;
});

Meteor.publish('accountInfo', function(userId) {
  debug.log('publish accountInfo', userId);
  check(userId, String);

  return [
    Meteor.users.find(userId, {
      fields: {
        'services.google.email': 1,
        'status.lastLogin.date': 1,
        'status.lastLogin.ipAddr': 1,
        username: 1,
        profile: 1,
        createdAt: 1
      }
    }),
    dbCompanies
      .find(
        {
          manager: userId
        },
        {
          fields: {
            companyName: 1,
            manager: 1
          },
          disableOplog: true
        }
      )
  ];
});
//一分鐘最多20次
limitSubscription('accountInfo');

Meteor.publish('accountOwnStocks', function(userId, offset) {
  debug.log('publish accountOwnStocks', {userId, offset});
  check(userId, String);
  check(offset, Match.Integer);

  let initialized = false;
  let total = dbDirectors.find({userId}).count();
  this.added('variables', 'totalCountOfAccountOwnStocks', {
    value: total
  });

  const observer = dbDirectors
    .find({userId}, {
      fields: {
        userId: 1,
        companyId: 1,
        stocks: 1
      },
      skip: offset,
      limit: 10,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('directors', id, fields);
        if (initialized) {
          total += 1;
          this.changed('variables', 'totalCountOfAccountOwnStocks', {
            value: total
          });
        }
      },
      changed: (id, fields) => {
        this.changed('directors', id, fields);
      },
      removed: (id) => {
        this.removed('directors', id);
        if (initialized) {
          total -= 1;
          this.changed('variables', 'totalCountOfAccountOwnStocks', {
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
//一分鐘最多20次
limitSubscription('accountOwnStocks');

Meteor.publish('accountInfoLog', function(userId, offset) {
  debug.log('publish accountInfoLog', {userId, offset});
  check(userId, String);
  check(offset, Match.Integer);

  const firstLogData = dbLog.findOne({userId}, {
    sort: {
      createdAt: 1
    } 
  });
  const firstLogDate = firstLogData ? firstLogData.createdAt : new Date();

  let initialized = false;
  let total = dbLog
    .find(
      {
        userId: {
          $in: [userId, '!all']
        },
        createdAt: {
          $gte: firstLogDate
        }
      }
    )
    .count();
  this.added('variables', 'totalCountOfAccountInfoLog', {
    value: total
  });

  const observer = dbLog
    .find(
      {
        userId: {
          $in: [userId, '!all']
        },
        createdAt: {
          $gte: firstLogDate
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
          this.changed('variables', 'totalCountOfAccountInfoLog', {
            value: total
          });
        }
      },
      removed: (id) => {
        this.removed('log', id);
        if (initialized) {
          total -= 1;
          this.changed('variables', 'totalCountOfAccountInfoLog', {
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
//一分鐘最多20次
limitSubscription('accountInfoLog');

Meteor.publish('validateUser', function(username) {
  debug.log('publish validateUser', username);
  check(username, String);

  dbValidatingUsers
    .find({username}, {
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('validatingUsers', id, fields);
      },
      removed: (id) => {
        this.removed('validatingUsers', id);
        this.stop();
      }
    });

  this.ready();
});
//一分鐘最多20次
limitSubscription('validateUser');

Meteor.publish('onlinePeopleNumber', function() {
  debug.log('publish onlinePeopleNumber');
  const onlinePeopleNumber = UserStatus.connections
    .find()
    .count();
  this.added('variables', 'onlinePeopleNumber', {
    value: onlinePeopleNumber
  });
  const intervalId = Meteor.setInterval(() => {
    countAndPublishOnlinePeopleNumber(this);
  }, 10000);

  this.ready();
  this.onStop(() => {
    Meteor.clearInterval(intervalId);
  });
});
//一分鐘最多重複訂閱5次
limitSubscription('onlinePeopleNumber', 5);
function countAndPublishOnlinePeopleNumber(publisher) {
  debug.log('countAndPublishOnlinePeopleNumber');
  const onlinePeopleNumber = UserStatus.connections
    .find()
    .count();
  publisher.changed('variables', 'onlinePeopleNumber', {
    value: onlinePeopleNumber
  });
}
