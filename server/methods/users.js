'use strict';
import url from 'url';
import querystring from 'querystring';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Accounts } from 'meteor/accounts-base';
import { WebApp } from 'meteor/webapp';
import { resourceManager } from '../resourceManager';
import { dbValidatingUsers } from '../../db/dbValidatingUsers';
import { dbCompanies } from '../../db/dbCompanies';
import { dbDirectors } from '../../db/dbDirectors';
import { dbLog } from '../../db/dbLog';
import { dbVariables } from '../../db/dbVariables';
import { config } from '../../config';

Meteor.methods({
  loginOrRegister(username, password) {
    check(username, String);
    check(password, String);

    if (Meteor.users.find({username}).count() > 0) {
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
const randomStringList = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function generateValidateCode() {
  return _.sample(randomStringList, 10).join('');
}

Meteor.methods({
  validateAccount(username) {
    check(username, String);
    resourceManager.throwErrorIsResourceIsLock(['validateAccount']);
    //先鎖定資源，再重新讀取一次資料進行運算
    let result;
    resourceManager.request('validateAccount', ['validateAccount'], (release) => {
      result = validateUsers(username);
      release();
    });
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
const getValidateUserUrlBodySync = Meteor.wrapAsync((callback) => {
  const request = require('request');
  const cheerio = require('cheerio');
  request(dbVariables.get('validateUserUrl'), (error, response, body) => {
    if (error) {
      callback(error);
    }
    else {
      const $pushList = cheerio.load(body)('div.push');
      callback(null, $pushList);
    }
  });
});
function validateUsers(checkUsername) {
  let checkResult = false;
  const validatingUserList = dbValidatingUsers.find({}, {disableOplog: true}).fetch();
  if (validatingUserList.length > 0) {
    const $pushList = getValidateUserUrlBodySync();
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
              name: username,
              money: config.beginMoney
            };
            const userId = Accounts.createUser({username, password, profile});
            dbLog.insert({
              logType: '驗證通過',
              userId: [userId],
              price: config.beginMoney,
              createdAt: new Date()
            });
            dbValidatingUsers.remove(validatingUser._id);
          }
        }
      }
    });
  }

  return checkResult;
}

//以Ajax方式發布使用者名稱
WebApp.connectHandlers.use(function(req, res, next) {
  const parsedUrl = url.parse(req.url);
  if (parsedUrl.pathname === '/userName') {
    const query = querystring.parse(parsedUrl.query);
    const userId = query.id;
    const userData = Meteor.users.findOne(userId, {
      fields: {
        'profile.name': 1
      }
    });
    if (userData) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.end(userData.profile.name);
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

Meteor.publish('accountInfo', function(userId) {
  check(userId, String);

  return [
    Meteor.users.find(userId, {
      fields: {
        profile: 1,
        createdAt: 1
      },
      disableOplog: true
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

Meteor.publish('accountOwnStocks', function(userId, offset) {
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

Meteor.publish('accountInfoLog', function(userId, offset) {
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

Meteor.publish('validateUser', function(username) {
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

Meteor.publish('onlinePeopleNumber', function() {
  let initialized = false;
  let total = Meteor.users
    .find({
      'status.online': true
    })
    .count();
  this.added('variables', 'onlinePeopleNumber', {
    value: total
  });

  const observer = Meteor.users
    .find(
      {
        'status.online': true
      },
      {
        disableOplog: true
      }
    )
    .observeChanges({
      added: () => {
        if (initialized) {
          total += 1;
          this.changed('variables', 'onlinePeopleNumber', {
            value: total
          });
        }
      },
      removed: () => {
        if (initialized) {
          total -= 1;
          this.changed('variables', 'onlinePeopleNumber', {
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
