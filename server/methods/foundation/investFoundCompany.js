import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbFoundations } from '/db/dbFoundations';
import { dbVariables } from '/db/dbVariables';
import { dbLog } from '/db/dbLog';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { resourceManager } from '/server/imports/threading/resourceManager';

Meteor.methods({
  investFoundCompany(companyId, amount) {
    check(this.userId, String);
    check(companyId, String);
    check(amount, Match.Integer);
    investFoundCompany(Meteor.user(), companyId, amount);

    return true;
  }
});
export function investFoundCompany(user, companyId, amount) {
  debug.log('investFoundCompany', { user, companyId, amount });
  if (user.profile.isInVacation) {
    throw new Meteor.Error(403, '您現在正在渡假中，請好好放鬆！');
  }
  if (user.profile.notPayTax) {
    throw new Meteor.Error(403, '您現在有稅單逾期未繳！');
  }
  if (_.contains(user.profile.ban, 'deal')) {
    throw new Meteor.Error(403, '您現在被金融管理會禁止了所有投資下單行為！');
  }
  const minimumInvest = dbVariables.get('foundation.minAmountPerInvestor');
  if (amount < minimumInvest) {
    throw new Meteor.Error(403, '最低投資金額為' + minimumInvest + '！');
  }
  const maximumInvest = Meteor.settings.public.maximumInvest;
  if (amount > maximumInvest) {
    throw new Meteor.Error(403, '最高投資金額為' + maximumInvest + '！');
  }
  if (user.profile.money < amount) {
    throw new Meteor.Error(403, '金錢不足，無法投資！');
  }
  const foundCompanyData = dbFoundations.findOne(companyId, { fields: { invest: 1 } });
  if (! foundCompanyData) {
    throw new Meteor.Error(404, '創立計劃並不存在，可能已經上市或被撤銷！');
  }
  const userId = user._id;
  const invest = foundCompanyData.invest;
  const existsInvest = _.findWhere(invest, { userId });
  if (existsInvest && (existsInvest.amount + amount) > maximumInvest) {
    throw new Meteor.Error(403, '您已經投資了$' + existsInvest.amount + '，最高追加投資為$' + (maximumInvest - existsInvest.amount) + '！');
  }
  // 先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.throwErrorIsResourceIsLock(['foundation' + companyId, 'user' + userId]);
  resourceManager.request('investFoundCompany', ['foundation' + companyId, 'user' + userId], (release) => {
    const user = Meteor.users.findOne(userId, {
      fields: {
        profile: 1
      }
    });
    if (user.profile.money < amount) {
      throw new Meteor.Error(403, '金錢不足，無法投資！');
    }
    const foundCompanyData = dbFoundations.findOne(companyId, {
      fields: {
        _id: 1,
        companyName: 1,
        invest: 1
      }
    });
    if (! foundCompanyData) {
      throw new Meteor.Error(404, '創立計劃並不存在，可能已經上市或被撤銷！');
    }
    const invest = foundCompanyData.invest;
    const existsInvest = _.findWhere(invest, { userId });
    if (existsInvest) {
      if ((existsInvest.amount + amount) > maximumInvest) {
        throw new Meteor.Error(403, '您已經投資了$' + existsInvest.amount + '，最高追加投資為$' + (maximumInvest - existsInvest.amount) + '！');
      }
      existsInvest.amount += amount;
    }
    else {
      invest.push({ userId, amount });
    }
    dbLog.insert({
      logType: '參與投資',
      userId: [userId],
      companyId: foundCompanyData._id,
      data: {
        companyName: foundCompanyData.companyName,
        fund: amount
      },
      createdAt: new Date()
    });
    Meteor.users.update(userId, {
      $inc: {
        'profile.money': amount * -1
      }
    });
    dbFoundations.update(companyId, {
      $set: {
        invest: invest
      }
    });
    release();
  });
}
// 兩秒鐘最多一次
limitMethod('investFoundCompany', 1, 2000);
