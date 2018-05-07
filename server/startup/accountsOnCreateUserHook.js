import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { _ } from 'meteor/underscore';

import { dbLog } from '/db/dbLog';
import { dbUserArchive } from '/db/dbUserArchive';
import { debug } from '/server/imports/utils/debug';

Accounts.onCreateUser((options, user) => {
  debug.log('onCreateUser', options);

  const { newUserInitialMoney, newUserBirthStones } = Meteor.settings.public;

  // TODO: 使用 SimpleSchema 的 clean 自動取得預設值
  user.profile = _.defaults({}, options.profile, {
    money: newUserInitialMoney,
    lastSeasonTotalWealth: 0,
    voteTickets: 0,
    vouchers: 0,
    stones: { birth: newUserBirthStones },
    ban: [],
    noLoginDayCount: 0,
    roles: []
  });

  if (user.services && user.services.google) {
    const email = user.services.google.email;
    user.profile.validateType = 'Google';
    user.profile.name = email;
  }

  const existingArchiveUser = dbUserArchive.findOne({
    name: user.profile.name,
    validateType: user.profile.validateType
  });

  if (existingArchiveUser) {
    user._id = existingArchiveUser._id;
    user.profile.name = existingArchiveUser.name;
    user.profile.roles = existingArchiveUser.roles;
    user.profile.stones.saint = existingArchiveUser.saintStones;
    user.profile.ban = existingArchiveUser.ban;
    dbUserArchive.update(existingArchiveUser._id, { $set: { status: 'registered' } });
  }
  else {
    if (user.profile.validateType === 'Google') {
      throw new Meteor.Error(403, '暫時停止以Google帳號進行註冊！');
    }
    dbUserArchive.insert({
      _id: user._id,
      status: 'registered',
      name: user.profile.name,
      validateType: user.profile.validateType,
      roles: user.profile.roles,
      saintStones: user.profile.stones.saint,
      ban: user.profile.ban
    });
  }

  dbLog.insert({
    logType: '驗證通過',
    userId: [user._id],
    data: {
      money: newUserInitialMoney
    },
    createdAt: new Date()
  });

  return user;
});
