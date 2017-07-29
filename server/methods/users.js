'use strict';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Accounts } from 'meteor/accounts-base';
import { lockManager } from '../../lockManager';
import { dbValidatingUsers } from '../../db/dbValidatingUsers';
import { dbCompanies } from '../../db/dbCompanies';
import { dbLog } from '../../db/dbLog';
import { config } from '../../config';

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
            dbLog.insert({
              logType: '驗證通過',
              username: [username],
              price: config.beginMoney
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
  check(this.userId, String);
  check(username, String);

  const result = [];
  if (username) {
    result.push(
      Meteor.users.find({username}, {
        fields: {
          username: 1,
          profile: 1,
          createdAt: 1
        }
      })
    );
  }
  else {
    result.push(
      Meteor.users.find({
        _id: this.userId
      }, {
        fields: {
          username: 1,
          profile: 1,
          createdAt: 1
        }
      })
    );
  }
  result.push(
    dbCompanies.find({
      manager: username
    })
  );

  return result;
});
Meteor.publish('accountInfoLog', function(username, offset) {
  check(this.userId, String);
  check(username, String);
  check(offset, Match.Integer);

  dbLog.find({username}, {
    sort: {
      createdAt: -1
    },
    skip: offset,
    limit: 50 + offset
  }).observeChanges({
    added: (id, fields) => {
      this.added('log', id, fields);
    }
  });
  this.ready();
});
