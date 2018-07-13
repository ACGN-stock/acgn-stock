import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
import { check } from 'meteor/check';
import { Accounts } from 'meteor/accounts-base';
import cheerio from 'cheerio';

import { limitGlobalMethod } from '/server/imports/utils/rateLimit';
import { dbValidatingUsers } from '/db/dbValidatingUsers';
import { dbVariables } from '/db/dbVariables';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  validatePTTAccount(username) {
    check(username, String);

    validateAllPTTAccounts();

    const existingUser = Meteor.users.findOne({ username });
    const validatingUser = dbValidatingUsers.findOne({ username });
    if (existingUser && ! validatingUser) {
      return true;
    }

    throw new Meteor.Error(403, '驗證未能通過，請確定推文位置、推文文章、推文方式與推文驗證碼是否正確！');
  }
});
limitGlobalMethod('validatePTTAccount');

// 將未認證的所有帳號當作 PTT 帳號進行一次認證
function validateAllPTTAccounts() {
  debug.log('validateAllPTTAccounts');
  const validatingUserList = dbValidatingUsers.find({}).fetch();
  if (validatingUserList.length === 0) {
    return;
  }

  const url = dbVariables.get('validateUserUrl');
  const httpCallResult = HTTP.get(url);
  const $pushList = cheerio.load(httpCallResult.content)('div.push');

  validatingUserList.forEach((validatingUser) => {
    const { username, validateCode, password } = validatingUser;

    const $userPushList = $pushList.find('.push-userid').filter(function() {
      return cheerio(this).text().trim() === username;
    }).closest('.push');

    if ($userPushList.find(`.push-content:contains(${validateCode})`).length === 0) {
      return;
    }

    const existingUser = Meteor.users.findOne({ username }, { fields: { _id: 1 } });

    if (existingUser) { // 既有帳號通過認證 → 重設密碼
      Accounts.setPassword(existingUser._id, password, { logout: true });
    }
    else { // 新人通過認證 → 建立新帳號
      Accounts.createUser({
        username,
        password,
        profile: {
          validateType: 'PTT',
          name: username
        }
      });
    }

    dbValidatingUsers.remove(validatingUser._id);
  });
}
