import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { getCurrentArena } from '/db/dbArena';
import { dbArenaFighters, arenaFighterAttributeNameList } from '/db/dbArenaFighters';
import { dbLog } from '/db/dbLog';
import { dbTaxes } from '/db/dbTaxes';
import { dbVariables } from '/db/dbVariables';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  investArenaFigher(companyId, attribute, investMoney) {
    check(this.userId, String);
    check(companyId, String);
    check(attribute, new Match.OneOf(...arenaFighterAttributeNameList));
    check(investMoney, Match.Integer);
    const user = Meteor.user();
    investArenaFigher({ user, companyId, attribute, investMoney });

    return true;
  }
});
function investArenaFigher({ user, companyId, attribute, investMoney }) {
  debug.log('investArenaFigher', { user, companyId, investMoney });
  if (user.profile.isInVacation) {
    throw new Meteor.Error(403, '您現在正在渡假中，請好好放鬆！');
  }
  if (_.contains(user.profile.ban, 'deal')) {
    throw new Meteor.Error(403, '您現在被金融管理會禁止了所有投資下單行為！');
  }
  if (investMoney < 1) {
    throw new Meteor.Error(403, '投資金額不可小於1！');
  }
  if (user.profile.money < investMoney) {
    throw new Meteor.Error(403, '剩餘金錢不足！');
  }
  const userId = user._id;
  if (dbTaxes.find({ userId }).count() > 0) {
    throw new Meteor.Error(403, '要先繳清稅單，才能在最萌亂鬥大賽中進行投注！');
  }
  const lastArenaData = getCurrentArena();
  if (! lastArenaData) {
    throw new Meteor.Error(403, '現在並沒有舉辦最萌亂鬥大賽！');
  }
  if (Date.now() >= lastArenaData.endDate.getTime()) {
    throw new Meteor.Error(403, '這一屆最萌亂鬥大賽的投資時間已過，下回請早！');
  }
  const arenaId = lastArenaData._id;
  const fighterData = dbArenaFighters.findOne({ arenaId, companyId });
  if (! fighterData) {
    throw new Meteor.Error(404, '這家公司尚未報名參加這一屆最萌亂鬥大賽！');
  }
  // 避免總投資額出現太誇張的數字
  check(fighterData[attribute] + investMoney, Match.Integer);
  resourceManager.throwErrorIsResourceIsLock(['season', 'arena' + companyId, 'user' + userId]);
  // 先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('investArenaFigher', ['arena' + companyId, 'user' + userId], (release) => {
    const user = Meteor.users.findOne(userId, { fields: { profile: 1 } });
    if (user.profile.money < investMoney) {
      throw new Meteor.Error(403, '剩餘金錢不足！');
    }
    const fighterData = dbArenaFighters.findOne({ arenaId, companyId });
    // 避免總投資額出現太誇張的數字
    check(fighterData[attribute] + investMoney, Match.Integer);

    const investors = fighterData.investors || [];
    const existingInvestor = _.findWhere(investors, { userId });
    if (existingInvestor) {
      existingInvestor.amount += investMoney;
    }
    else {
      investors.push({ userId, amount: investMoney });
    }

    dbArenaFighters.update(fighterData._id, {
      $inc: {
        [attribute]: investMoney,
        totalInvestedAmount: investMoney
      },
      $set: {
        investors
      }
    });
    Meteor.users.update(userId, {
      $inc: {
        'profile.money': -1 * investMoney
      }
    });
    const attrName = attribute.toUpperCase();
    const createdAt = new Date();
    // 若有上次發薪後的亂鬥加強紀錄，則併為同一筆紀錄
    const existsLogData = dbLog.findOne({
      userId: userId,
      createdAt: {
        $gt: new Date(dbVariables.get('lastPayTime').getTime())
      },
      companyId: companyId,
      logType: '亂鬥加強',
      data: {
        attrName
      }
    });
    if (existsLogData) {
      dbLog.update(existsLogData._id, {
        $set: {
          createdAt: createdAt
        },
        $inc: {
          'data.money': investMoney
        }
      });
    }
    else {
      dbLog.insert({
        logType: '亂鬥加強',
        userId: [userId],
        companyId: companyId,
        data: {
          attrName: attrName,
          money: investMoney
        },
        createdAt: createdAt
      });
    }
    release();
  });
}
