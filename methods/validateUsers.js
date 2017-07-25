'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { lockManager } from './lockManager';
import { dbValidatingUsers } from '../db/dbValidatingUsers';

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

//供前端使用的偽驗證Method
if (Meteor.isClient) {
  Meteor.methods({
    validateAccount() {
      lockManager.lock(['validate']);
    }
  });
}
