'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Accounts } from 'meteor/accounts-base';
import { resourceManager } from '../resourceManager';
import { dbValidatingUsers } from '../../db/dbValidatingUsers';
import { dbCompanies } from '../../db/dbCompanies';
import { dbDirectors } from '../../db/dbDirectors';
import { dbLog } from '../../db/dbLog';
import { dbConfig } from '../../db/dbConfig';
import { config } from '../../config';

Meteor.methods({
  loginOrRegister(username, password) {
    check(username, String);
    check(password, String);

    if (Meteor.users.findOne({username})) {
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
    else if (Meteor.users.findOne({username})) {
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
  const configData = dbConfig.findOne();
  request(configData.validateUserUrl, (error, response, body) => {
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
          const existUser = Meteor.users.findOne({username});
          if (existUser) {
            Accounts.setPassword(existUser._id, password, {
              logout: true
            });
            dbValidatingUsers.remove({_id: validatingUser._id});
          }
          else {
            const profile = {
              money: config.beginMoney
            };
            Accounts.createUser({username, password, profile});
            dbLog.insert({
              logType: '驗證通過',
              username: [username],
              price: config.beginMoney,
              createdAt: new Date()
            });
            dbValidatingUsers.remove({_id: validatingUser._id});
          }
        }
      }
    });
  }

  return checkResult;
}

Meteor.publish('accountInfo', function(username) {
  check(username, String);

  return [
    Meteor.users.find({username}, {
      fields: {
        username: 1,
        profile: 1,
        createdAt: 1
      }
    }),
    dbCompanies.find({
      manager: username
    })
  ];
});

Meteor.publish('accountOwnStocks', function(username, offset) {
  check(username, String);
  check(offset, Match.Integer);

  const total = dbDirectors.find({username}).count();
  this.added('pagination', 'accountOwnStocks', {total});

  dbDirectors
    .find({username}, {
      skip: offset,
      limit: 10
    })
    .forEach((directorData) => {
      this.added('directors', directorData._id, directorData);
    });
  this.ready();

  return [];
});

Meteor.publish('accountInfoLog', function(username, offset) {
  check(username, String);
  check(offset, Match.Integer);

  const total = dbLog.find({username}).count();
  this.added('pagination', 'accountInfoLog', {total});

  dbLog
    .find({username}, {
      sort: {
        createdAt: -1
      },
      skip: offset,
      limit: 30
    })
    .forEach((logData) => {
      this.added('log', logData._id, logData);
    });
  this.ready();
});

Meteor.publish('validateUser', function(username) {
  check(username, String);

  dbValidatingUsers.find({username}).observeChanges({
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
