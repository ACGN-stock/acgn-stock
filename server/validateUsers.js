'use strict';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Accounts } from 'meteor/accounts-base';
import { lockManager } from '../methods/lockManager';
import { dbValidatingUsers } from '../db/dbValidatingUsers';
import { config } from '../config';

if (Meteor.isServer) {
  Meteor.methods({
    validateAccount(username) {
      check(username, String);
      const unlock = lockManager.lock(['validate']);
      const result = validateUsers(username);
      unlock();
      if (result) {
        return true;
      }
      else {
        throw new Meteor.Error('[403] Forbidden', '驗證未能通過，請確定推文位置、推文文章、推文方式與推文驗證碼是否正確！');
      }
    }
  });
}

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
            dbValidatingUsers.remove({_id: validatingUser._id});
          }
        }
      }
    });
  }

  return checkResult;
}
