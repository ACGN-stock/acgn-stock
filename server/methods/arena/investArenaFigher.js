'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { resourceManager } from '/server/imports/resourceManager';
import { dbArena } from '/db/dbArena';
import { dbArenaFighters } from '/db/dbArenaFighters';
import { dbLog } from '/db/dbLog';
import { dbVariables } from '/db/dbVariables';
import { debug } from '/server/imports/debug';

Meteor.methods({
  investArenaFigher(companyId, attribute, investMoney) {
    check(this.userId, String);
    check(companyId, String);
    const user = Meteor.user();
    investArenaFigher({user, companyId, attribute, investMoney});

    return true;
  }
});
function investArenaFigher({user, companyId, attribute, investMoney}) {
  debug.log('investArenaFigher', {user, companyId, investMoney});
  if (user.profile.isInVacation) {
    throw new Meteor.Error(403, '您現在正在渡假中，請好好放鬆！');
  }
  if (user.profile.notPayTax) {
    throw new Meteor.Error(403, '您現在有稅單逾期未繳！');
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
  const lastArenaData = dbArena.findOne({}, {
    sort: {
      beginDate: -1
    },
    fields: {
      _id: 1,
      endDate: 1
    }
  });
  if (! lastArenaData) {
    throw new Meteor.Error(403, '現在並沒有舉辦最萌亂鬥大賽！');
  }
  if (Date.now() >= lastArenaData.endDate.getTime()) {
    throw new Meteor.Error(403, '這一屆最萌亂鬥大賽的報名時間已過，下回請早！');
  }
  const arenaId = lastArenaData._id;
  const fighterData = dbArenaFighters.findOne({arenaId, companyId});
  if (! fighterData) {
    throw new Meteor.Error(404, '這家公司尚未報名參加這一屆最萌亂鬥大賽！');
  }
  const userId = user._id;
  resourceManager.throwErrorIsResourceIsLock(['season', 'arena' + companyId, 'user' + userId]);
  //先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('investArenaFigher', ['arena' + companyId, 'user' + userId], (release) => {
    const user = Meteor.users.findOne(userId, {
      fields: {
        profile: 1
      }
    });
    if (user.profile.money < investMoney) {
      throw new Meteor.Error(403, '剩餘金錢不足！');
    }
    dbArenaFighters.update(fighterData._id, {
      $inc: {
        [attribute]: investMoney
      }
    });
    Meteor.users.update(userId, {
      $inc: {
        'profile.money': -1 * investMoney
      }
    });
    const attrName = attribute.toUpperCase();
    const createdAt = new Date();
    //若有上次發薪後的亂鬥加強紀錄，則併為同一筆紀錄
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
