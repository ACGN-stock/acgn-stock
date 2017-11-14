'use strict';
import cheerio from 'cheerio';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
import { check, Match } from 'meteor/check';
import { Accounts } from 'meteor/accounts-base';
import { UserStatus } from 'meteor/mizzao:user-status';
import { dbLog } from '../../db/dbLog';
import { dbThreads } from '../../db/dbThreads';
import { dbUserArchive } from '../../db/dbUserArchive';
import { dbValidatingUsers } from '../../db/dbValidatingUsers';
import { dbVariables } from '../../db/dbVariables';
import { limitMethod, limitSubscription, limitGlobalMethod } from './rateLimit';
import { debug } from '../debug';

Meteor.methods({
  loginOrRegister({username, password, type, reset}) {
    debug.log('loginOrRegister', {username, password, type, reset});
    check(username, String);
    check(password, String);
    check(type, new Match.OneOf('PTT', 'Bahamut'));
    check(reset, Boolean);

    const checkUsername = (type === 'Bahamut') ? ('?' + username) : username;
    if (Meteor.users.find({username: checkUsername}).count() > 0 && ! reset) {
      return true;
    }
    else {
      const existValidatingUser = dbValidatingUsers.findOne({
        username: checkUsername,
        password
      });
      if (existValidatingUser) {
        return existValidatingUser.validateCode;
      }
      else {
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
    }
  }
});
//一分鐘最多五次
limitMethod('loginOrRegister', 5);
const randomStringList = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function generateValidateCode() {
  return _.sample(randomStringList, 10).join('');
}

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

    const $userPushList = $pushList.find(`.push-userid:contains(${username})`).closest('.push');
    if ($userPushList.find(`.push-content:contains(${validateCode})`).length === 0) {
      return;
    }

    const existingUser = Meteor.users.findOne({username}, { fields: { _id: 1 } });

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

    const existingUser = Meteor.users.findOne({username: checkUsername}, { fields: { _id: 1 } });

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
//一分鐘最多1次
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

Accounts.validateNewUser((user) => {
  if (user.services && user.services.google) {
    throw new Meteor.Error(403, '暫時停止以Google帳號進行註冊！');
  }

  return true;
});
Accounts.onCreateUser((options, user) => {
  debug.log('onCreateUser', options);
  user.profile = _.defaults({}, options.profile, {
    money: Meteor.settings.public.beginMoney,
    lastSeasonTotalWealth: 0,
    vote: 0,
    stone: 0,
    isAdmin: false,
    ban: [],
    noLoginDayCount: 0
  });
  dbLog.insert({
    logType: '驗證通過',
    userId: [user._id],
    price: Meteor.settings.public.beginMoney,
    createdAt: new Date()
  });
  if (user.services && user.services.google) {
    const email = user.services.google.email;
    user.profile.validateType = 'Google';
    user.profile.name = email;
  }
  const existsArchiveUser = dbUserArchive.findOne({
    name: user.profile.name,
    validateType: user.profile.validateType
  });
  if (existsArchiveUser) {
    user._id = existsArchiveUser._id;
  }
  else {
    dbUserArchive.insert({
      _id: user._id,
      status: 'registered',
      name: user.profile.name,
      validateType: user.profile.validateType,
      isAdmin: user.profile.isAdmin,
      stone: user.profile.stone,
      ban: user.profile.ban
    });
  }

  return user;
});

Meteor.publish('validateUser', function(username) {
  debug.log('publish validateUser', username);
  check(username, String);

  const observer = dbValidatingUsers
    .find(
      {
        username: {
          $in: [
            username,
            '?' + username
          ]
        }
      },
      {
        disableOplog: true
      }
    )
    .observeChanges({
      added: (id, fields) => {
        this.added('validatingUsers', id, fields);
      },
      removed: (id) => {
        this.removed('validatingUsers', id);
        this.stop();
      }
    });

  this.onStop(() => {
    observer.stop();
  });
  this.ready();
});
//一分鐘最多20次
limitSubscription('validateUser');

Meteor.publish('onlinePeopleNumber', function() {
  debug.log('publish onlinePeopleNumber');
  let onlinePeopleNumber = 0;
  dbThreads.find().forEach((threadData) => {
    onlinePeopleNumber += threadData.connections;
  });
  this.added('variables', 'onlinePeopleNumber', {
    value: onlinePeopleNumber
  });
  const intervalId = Meteor.setInterval(() => {
    countAndPublishOnlinePeopleNumber(this);
  }, 10000);

  this.ready();
  this.onStop(() => {
    Meteor.clearInterval(intervalId);
  });
});
//一分鐘最多重複訂閱5次
limitSubscription('onlinePeopleNumber', 5);
function countAndPublishOnlinePeopleNumber(publisher) {
  debug.log('countAndPublishOnlinePeopleNumber');
  let onlinePeopleNumber = 0;
  dbThreads.find().forEach((threadData) => {
    onlinePeopleNumber += threadData.connections;
  });
  publisher.changed('variables', 'onlinePeopleNumber', {
    value: onlinePeopleNumber
  });
}

Meteor.publish('userFavorite', function() {
  debug.log('publish userFavorite');
  if (typeof this.userId === 'string') {
    return Meteor.users.find(this.userId, {
      favorite: 1
    });
  }
  else {
    return [];
  }
});
limitSubscription('userFavorite');

Meteor.publish('userCreatedAt', function() {
  debug.log('publish userCreatedAt');
  if (typeof this.userId === 'string') {
    return Meteor.users.find(this.userId, {
      createdAt: 1
    });
  }
  else {
    return [];
  }
});
limitSubscription('userCreatedAt');

Meteor.startup(function() {
  //登入時會自動在其他瀏覽器上清空
  UserStatus.events.on('connectionLogin', function(logoutData) {
    if (logoutData.userId) {
      Meteor.users.update(logoutData.userId, {
        $push: {
          'services.resume.loginTokens': {
            $each: [],
            $slice: -1
          }
        }
      });
    }
  });
  //登出、離線時更新最後上線日期
  UserStatus.events.on('connectionLogout', function(logoutData) {
    if (logoutData.userId) {
      Meteor.users.update(logoutData.userId, {
        $set: {
          'statue.lastLogin.date': logoutData.logoutTime
        }
      });
    }
  });
});
