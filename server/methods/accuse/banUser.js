import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { dbFoundations } from '/db/dbFoundations';
import { dbLog } from '/db/dbLog';
import { banTypeList } from '/db/users';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  banUser({userId, message, banType}) {
    check(this.userId, String);
    check(userId, String);
    check(message, String);
    check(banType, new Match.OneOf(...banTypeList));
    banUser(Meteor.user(), {userId, message, banType});

    return true;
  }
});
function banUser(user, {userId, message, banType}) {
  debug.log('banUser', {user, userId, message, banType});
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '您並非金融管理會委員，無法進行此操作！');
  }
  const accuseUserData = Meteor.users.findOne(userId, {
    fields: {
      _id: 1,
      'profile.ban': 1
    }
  });
  if (! accuseUserData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + userId + '」的使用者！');
  }
  const oldBanList = accuseUserData.profile.ban;
  let logType;
  let newBanList;
  if (_.contains(oldBanList, banType)) {
    newBanList = _.without(oldBanList, banType);
    switch (banType) {
      case 'accuse': {
        logType = '解除舉報';
        break;
      }
      case 'deal': {
        logType = '解除下單';
        break;
      }
      case 'chat': {
        logType = '解除聊天';
        break;
      }
      case 'advertise': {
        logType = '解除廣告';
        break;
      }
      case 'manager': {
        logType = '解除禁任';
        break;
      }
    }
  }
  else {
    newBanList = _.union(oldBanList, [banType]);
    switch (banType) {
      case 'accuse': {
        logType = '禁止舉報';
        break;
      }
      case 'deal': {
        logType = '禁止下單';
        break;
      }
      case 'chat': {
        logType = '禁止聊天';
        break;
      }
      case 'advertise': {
        logType = '禁止廣告';
        break;
      }
      case 'manager': {
        logType = '禁任經理';
        dbCompanies
          .find(
            {
              $or: [
                {
                  manager: userId
                },
                {
                  candidateList: userId
                }
              ]
            },
            {
              fields: {
                _id: 1,
                manager: 1,
                candidateList: 1,
                voteList: 1
              }
            }
          )
          .forEach((companyData) => {
            dbLog.insert({
              logType: '撤職紀錄',
              userId: [user._id, userId],
              companyId: companyData._id,
              createdAt: new Date()
            });
            const manager = (companyData.manager === userId ? '!none' : companyData.manager);
            const candidateList = companyData.candidateList;
            const voteList = companyData.voteList;
            const candidateIndex = _.indexOf(candidateList, userId);
            if (candidateIndex !== -1) {
              candidateList.splice(candidateIndex, 1);
              voteList.splice(candidateIndex, 1);
            }
            dbCompanies.update(companyData._id, {
              $set: {
                manager: manager,
                candidateList: candidateList,
                voteList: voteList
              }
            });
          });
        dbFoundations.update(
          {
            manager: userId
          },
          {
            $set: {
              manager: '!none'
            }
          }
        );

        break;
      }
    }
  }
  if (logType && newBanList) {
    Meteor.users.update(userId, {
      $set: {
        'profile.ban': newBanList
      }
    });
    dbLog.insert({
      logType: logType,
      userId: [user._id, userId],
      data: {
        reason: message
      },
      createdAt: new Date()
    });
  }
}
