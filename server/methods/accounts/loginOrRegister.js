import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { limitMethod } from '/server/imports/utils/rateLimit';
import { dbValidatingUsers } from '/db/dbValidatingUsers';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  loginOrRegister({ username, password, type, reset }) {
    debug.log('loginOrRegister', { username, password, type, reset });
    check(username, String);
    check(password, String);
    check(type, new Match.OneOf('PTT', 'Bahamut'));
    check(reset, Boolean);

    const checkUsername = (type === 'Bahamut') ? `?${username}` : username;

    if (Meteor.users.find({ username: checkUsername }).count() > 0 && ! reset) {
      return true;
    }

    const validatingUser = dbValidatingUsers.findOne({ username: checkUsername });
    if (validatingUser) {
      if (validatingUser.password !== password) {
        dbValidatingUsers.update({ _id: validatingUser._id }, { $set: { password } });
      }

      return validatingUser.validateCode;
    }

    const validateCode = generateValidateCode();
    const createdAt = new Date();
    dbValidatingUsers.insert({
      username: checkUsername,
      password,
      validateCode,
      createdAt
    });

    return validateCode;
  }
});
// 一分鐘最多五次
limitMethod('loginOrRegister', 5);

const randomStringList = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generateValidateCode() {
  return _.sample(randomStringList, 10).join('');
}
