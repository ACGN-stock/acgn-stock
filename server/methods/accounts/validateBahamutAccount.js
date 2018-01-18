import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
import { check } from 'meteor/check';
import { Accounts } from 'meteor/accounts-base';
import cheerio from 'cheerio';

import { limitMethod } from '/server/imports/utils/rateLimit';
import { dbValidatingUsers } from '/db/dbValidatingUsers';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  validateBahamutAccount(username) {
    check(username, String);

    debug.log('validateBahamutAccount', username);
    const checkUsername = `?${username}`;
    const validatingUser = dbValidatingUsers.findOne({ username: checkUsername });

    if (! validatingUser) {
      const existingUser = Meteor.users.findOne({ username: checkUsername }, { fields: { _id: 1 } });

      if (existingUser) {
        return true;
      }
      else {
        throw new Meteor.Error(404, '無法取得驗證碼，請重新註冊！');
      }
    }

    if (! checkBahamutPhoneValidation(username)) {
      throw new Meteor.Error(403, '您的巴哈姆特帳號尚未通過手機認證，請先通過手機認證之後再進行驗證！');
    }

    const { validateCode, password } = validatingUser;
    if (! checkBahamutValidationCodeReply(username, validateCode)) {
      throw new Meteor.Error(403, `無法查詢到驗證碼，請確定驗證碼[${validateCode}]是否輸入正確，且有出現在您的訪客留言頁面上！`);
    }

    const existingUser = Meteor.users.findOne({ username: checkUsername }, { fields: { _id: 1 } });

    if (existingUser) { // 既有帳號通過認證 → 重設密碼
      Accounts.setPassword(existingUser._id, password, { logout: true });
    }
    else { // 新人通過認證 → 建立新帳號
      Accounts.createUser({
        username: checkUsername,
        password,
        profile: {
          validateType: 'Bahamut',
          name: username
        }
      });
    }

    dbValidatingUsers.remove(validatingUser._id);

    return true;
  }
});
// 一分鐘最多1次
limitMethod('validateBahamutAccount', 1);

// 檢查巴哈小屋是否有通過手機認證的資訊
function checkBahamutPhoneValidation(username) {
  const { content } = HTTP.get(`https://home.gamer.com.tw/homeindex.php?owner=${username}`);

  return cheerio.load(content)('li')
    .filter((i, e) => {
      const children = e.children;

      return children.length === 1 && (children[0].data === '手機認證：有' || children[0].data === '手機認證：永久');
    })
    .length > 0;
}

// 檢查巴哈小屋的訪客留言是否有自己貼出的驗證碼
function checkBahamutValidationCodeReply(username, validateCode) {
  const { content } = HTTP.get(`https://home.gamer.com.tw/homeReplyList.php?owner=${username}`);

  return cheerio.load(content)(`a[href="home.php?owner=${username}"]`)
    .parent()
    .text()
    .indexOf(`：${validateCode}`) !== -1;
}
