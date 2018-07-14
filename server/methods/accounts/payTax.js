import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check, Match } from 'meteor/check';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbLog } from '/db/dbLog';
import { dbTaxes } from '/db/dbTaxes';
import { dbVariables } from '/db/dbVariables';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  payTax(taxId, amount) {
    check(this.userId, String);
    check(taxId, Mongo.ObjectID);
    check(amount, Match.Integer);
    payTax(Meteor.user(), taxId, amount);

    return true;
  }
});
function payTax(user, taxId, amount) {
  debug.log('payTax', { user, taxId, amount });
  if (user.profile.isInVacation) {
    throw new Meteor.Error(403, '您現在正在渡假中，請好好放鬆！');
  }
  if (amount < 1) {
    throw new Meteor.Error(403, '繳納稅金數量錯誤！');
  }
  if (user.profile.money < amount) {
    throw new Meteor.Error(403, '剩餘金錢不足，無法繳納稅金！');
  }
  const taxData = dbTaxes.findOne(taxId);
  if (! taxData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + taxId + '」的稅金資料！');
  }
  const totalNeedPay = taxData.stockTax + taxData.moneyTax + taxData.zombieTax + taxData.fine - taxData.paid;
  if (amount > totalNeedPay) {
    throw new Meteor.Error(403, '繳納金額與應納金額不相符！');
  }
  const userId = user._id;
  resourceManager.throwErrorIsResourceIsLock(['user' + userId]);
  // 先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('payTax', ['user' + userId], (release) => {
    const user = Meteor.users.findOne(userId, {
      fields: {
        profile: 1
      }
    });
    if (user.profile.money < amount) {
      throw new Meteor.Error(403, '剩餘金錢不足，無法繳納稅金！');
    }
    const taxData = dbTaxes.findOne(taxId);
    if (! taxData) {
      throw new Meteor.Error(404, '找不到識別碼為「' + taxId + '」的稅金資料！');
    }
    const totalNeedPay = taxData.stockTax + taxData.moneyTax + taxData.zombieTax + taxData.fine - taxData.paid;
    if (amount > totalNeedPay) {
      throw new Meteor.Error(403, '繳納金額與應納金額不相符！');
    }
    const createdAt = new Date();
    // 若在上次發薪後的繳稅紀錄，則併為同一筆紀錄
    const existsLogData = dbLog.findOne({
      userId: userId,
      createdAt: {
        $gt: new Date(dbVariables.get('lastPayTime').getTime())
      },
      logType: '繳納稅金'
    });
    if (existsLogData) {
      dbLog.update(existsLogData._id, {
        $set: {
          createdAt: createdAt
        },
        $inc: {
          'data.paid': amount
        }
      });
    }
    else {
      dbLog.insert({
        logType: '繳納稅金',
        userId: [userId],
        data: { paid: amount },
        createdAt: createdAt
      });
    }
    if (amount === totalNeedPay) {
      dbTaxes.remove(taxId);
    }
    else {
      dbTaxes.update(taxId, {
        $inc: {
          paid: amount
        }
      });
    }
    const expiredTaxesCount = dbTaxes
      .find({
        userId: userId,
        expireDate: {
          $lte: new Date()
        }
      })
      .count();
    // 如果還有逾期未繳的稅單，扣錢就好
    if (expiredTaxesCount > 0) {
      Meteor.users.update(userId, {
        $inc: {
          'profile.money': amount * -1
        }
      });
    }
    // 所有逾期未繳的稅單都繳納完畢後，取消繳稅逾期狀態
    else {
      Meteor.users.update(userId, {
        $inc: {
          'profile.money': amount * -1
        },
        $set: {
          'profile.notPayTax': false
        }
      });
    }
    release();
  });
}
