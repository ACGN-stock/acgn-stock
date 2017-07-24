'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Accounts } from 'meteor/accounts-base';
import { dbValidatingUsers } from '../db/dbValidatingUsers';
import config from '../config';

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

let lastValidateTime = Date.now();
Meteor.methods({
  validateAccount(username) {
    check(username, String);
    if (Date.now() - lastValidateTime < 60000) {
      throw new Meteor.Error('[429] Too Many Requests', '驗證中心忙碌中，請稍候再試...');
    }
    const result = validateUsers(username);
    if (result) {
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
  request(config.validateUserUrl, (error, response, body) => {
    if (error) {
      callback(error);
    }
    else {
      const $pushList = cheerio.load(body)('div.push');
      callback(null, $pushList);
    }
  });
});
export function validateUsers(checkUsername) {
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
            Accounts.createUser({username, password});
            dbValidatingUsers.remove({_id: validatingUser._id});
          }
        }
      }
    });
  }
  lastValidateTime = Date.now();

  return checkResult;
}
