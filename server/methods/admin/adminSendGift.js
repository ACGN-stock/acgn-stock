import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { computeActiveUserIds } from '/server/imports/utils/computeActiveUserIds';
import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

// TODO 將 client 端的定義一同合併
const userTypeDisplayNameMap = {
  all: '全體玩家',
  active: '活躍玩家',
  recentlyLoggedIn: '近日內有登入的玩家',
  specified: '指定玩家'
};

// TODO 將 client 端的定義一同合併
const giftTypeDisplayNameMap = {
  saintStone: '聖晶石',
  rainbowStone: '彩虹石',
  rainbowStoneFragment: '彩紅石碎片',
  questStone: '任務石',
  money: '金錢',
  voucher: '消費券',
  voteTicket: '推薦票'
};

Meteor.methods({
  adminSendGift({ userType, giftType, amount, reason, days, users }) {
    check(this.userId, String);
    check(userType, Match.OneOf(...Object.keys(userTypeDisplayNameMap)));
    check(giftType, Match.OneOf(...Object.keys(giftTypeDisplayNameMap)));
    check(amount, Match.Integer);
    check(reason, String);

    if (userType === 'specified') {
      check(users, [String]);
    }

    if (userType === 'recentlyLoggedIn') {
      check(days, Match.Integer);
    }

    adminSendGift(Meteor.user(), { userType, giftType, amount, reason, days, users });

    return true;
  }
});
function adminSendGift(currentUser, { userType, giftType, amount, reason, days, users }) {
  debug.log('adminSendGift', { currentUser, userType, giftType, amount, reason, days, users });

  guardUser(currentUser).checkHasAnyRoles('superAdmin', 'planner');

  if (amount < 1) {
    throw new Meteor.Error(403, '數量需至少為 1！');
  }

  if (reason.length < 1) {
    throw new Meteor.Error(403, '送禮原因必須大於 1 字！');
  }

  if (reason.length > 200) {
    throw new Meteor.Error(403, '送禮原因必須在 200 字以內！');
  }

  if (userType === 'specified' && users.length < 1) {
    throw new Meteor.Error(403, `玩家列表至少需有一人！`);
  }

  if (userType === 'recentlyLoggedIn' && days < 1) {
    throw new Meteor.Error(403, `天數至少為一天！`);
  }

  const userModifier = {};

  switch (giftType) {
    case 'saintStone':
      userModifier.$inc = { 'profile.stones.saint': amount };
      break;
    case 'rainbowStone':
      userModifier.$inc = { 'profile.stones.rainbow': amount };
      break;
    case 'rainbowStoneFragment':
      userModifier.$inc = { 'profile.stones.rainbowFragment': amount };
      break;
    case 'questStone':
      userModifier.$inc = { 'profile.stones.quest': amount };
      break;
    case 'money':
      userModifier.$inc = { 'profile.money': amount };
      break;
    case 'voucher':
      userModifier.$inc = { 'profile.vouchers': amount };
      break;
    case 'voteTicket':
      userModifier.$inc = { 'profile.voteTickets': amount };
      break;
    default:
      throw new Meteor.Error(403, '不合法的禮物類型！');
  }

  const userFilter = {};

  switch (userType) {
    case 'all':
      // no-op
      break;
    case 'active':
      userFilter._id = { $in: computeActiveUserIds() };
      break;
    case 'recentlyLoggedIn':
      userFilter['status.lastLogin.date'] = { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
      break;
    case 'specified':
      userFilter._id = { $in: users };
      break;
    default:
      throw new Meteor.Error(403, '不合法的玩家類型！');
  }

  Meteor.users.update(userFilter, userModifier, { multi: true });

  const logUserIds = [currentUser._id];

  if (userType === 'specified') {
    logUserIds.push(...users);
  }
  else {
    logUserIds.push('!all');
  }

  const logData = { userType, giftType, amount, reason };

  if (userType === 'recentlyLoggedIn') {
    logData.days = days;
  }

  dbLog.insert({
    logType: '營運送禮',
    userId: logUserIds,
    data: logData,
    createdAt: new Date()
  });
}
