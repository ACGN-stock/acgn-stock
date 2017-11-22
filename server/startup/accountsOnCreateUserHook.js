import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { _ } from 'meteor/underscore';

import { dbLog } from '/db/dbLog';
import { dbUserArchive } from '/db/dbUserArchive';
import { debug } from '/server/imports/debug';

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
    user.profile.name = existsArchiveUser.name;
    user.profile.isAdmin = existsArchiveUser.isAdmin;
    user.profile.stone = existsArchiveUser.stone;
    user.profile.ban = existsArchiveUser.ban;
    dbUserArchive.update(existsArchiveUser._id, {
      $set: {
        status: 'registered'
      }
    });
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
      isAdmin: user.profile.isAdmin,
      stone: user.profile.stone,
      ban: user.profile.ban
    });
  }

  return user;
});
