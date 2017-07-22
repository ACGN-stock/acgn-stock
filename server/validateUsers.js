'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Accounts } from 'meteor/accounts-base';
import { dbValidatingUsers } from '../db/dbValidatingUsers';
import config from '../config.json';

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
        const insertTime = new Date();
        dbValidatingUsers.insert({username, password, validateCode, insertTime});
      }

      return validateCode;
    }
  }
});

const randomStringList = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function generateValidateCode() {
  return _.sample(randomStringList, 10).join('');
}

const getValidateUserUrlBodySync = Meteor.wrapAsync((callback) => {
  const request = require('request');
  const cheerio = require('cheerio');
  request(config.validateUserUrl, (error, response, body) => {
    const $pushList = cheerio.load(body)('div.push');
    callback(error, $pushList);
  });
});
function validateUsers() {
  const validatingUserList = dbValidatingUsers.find().fetch();
  if (validatingUserList.length > 0) {
    const $pushList = getValidateUserUrlBodySync();
    validatingUserList.forEach((validatingUser) => {
      const username = validatingUser.username;
      const $userPushList = $pushList.find('.push-userid:contains(' + username + ')').closest('.push');
      if ($userPushList.length > 0) {
        const validateCode = validatingUser.validateCode;
        if ($userPushList.find('.push-content:contains(' + validateCode + ')').length > 0) {
          const password = validatingUser.password;
          const existUser = Meteor.users.findOne({username});
          if (existUser) {
            Accounts.setPassword(existUser._id, password, {
              logout: true
            });
            dbValidatingUsers.remove(validatingUser._id);
          }
          else {
            Accounts.createUser({username, password});
            dbValidatingUsers.remove(validatingUser._id);
          }
        }
      }
    });
  }
}
Meteor.setInterval(validateUsers, 60000);
