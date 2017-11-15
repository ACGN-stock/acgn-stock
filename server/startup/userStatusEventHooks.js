import { Meteor } from 'meteor/meteor';
import { UserStatus } from 'meteor/mizzao:user-status';

// 登入時會自動在其他瀏覽器上清空
UserStatus.events.on('connectionLogin', function(data) {
  if (data.userId) {
    Meteor.users.update(data.userId, {
      $push: {
        'services.resume.loginTokens': {
          $each: [],
          $slice: -1
        }
      }
    });
  }
});

// 登出、離線時更新最後上線日期
UserStatus.events.on('connectionLogout', function(data) {
  if (data.userId) {
    Meteor.users.update(data.userId, {
      $set: {
        'statue.lastLogin.date': data.logoutTime
      }
    });
  }
});
