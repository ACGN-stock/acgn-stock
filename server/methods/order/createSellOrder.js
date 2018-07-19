import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbCompanies, getPriceLimits } from '/db/dbCompanies';
import { dbDirectors } from '/db/dbDirectors';
import { dbOrders } from '/db/dbOrders';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { createOrder } from '/server/imports/createOrder';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  createSellOrder(orderData) {
    check(this.userId, String);
    check(orderData, {
      companyId: String,
      unitPrice: Match.Integer,
      amount: Match.Integer
    });
    createSellOrder(Meteor.user(), orderData);

    return true;
  }
});
export function createSellOrder(user, orderData) {
  debug.log('createSellOrder', { user, orderData });
  if (user.profile.isInVacation) {
    throw new Meteor.Error(403, '您現在正在渡假中，請好好放鬆！');
  }
  if (_.contains(user.profile.ban, 'deal')) {
    throw new Meteor.Error(403, '您現在被金融管理會禁止了所有投資下單行為！');
  }
  if (orderData.unitPrice < 1) {
    throw new Meteor.Error(403, '販賣單價不可小於1！');
  }
  if (orderData.amount < 1) {
    throw new Meteor.Error(403, '販賣數量不可小於1！');
  }
  const userId = user._id;
  const companyId = orderData.companyId;
  const existsBuyOrderCursor = dbOrders.find({
    companyId: companyId,
    userId: userId,
    orderType: '購入'
  });
  if (existsBuyOrderCursor.count() > 0) {
    throw new Meteor.Error(403, '有買入該公司股票的訂單正在執行中，無法同時下達賣出的訂單！');
  }
  const directorData = dbDirectors.findOne({ companyId, userId }, {
    fields: {
      stocks: 1
    }
  });
  if (! directorData || directorData.stocks < orderData.amount) {
    throw new Meteor.Error(403, '擁有的股票數量不足，訂單無法成立！');
  }
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      _id: 1,
      companyName: 1,
      listPrice: 1,
      lastPrice: 1,
      isSeal: 1,
      capital: 1,
      totalValue: 1,
      createdAt: 1
    }
  });
  if (! companyData) {
    throw new Meteor.Error(404, '不存在的公司股票，訂單無法成立！');
  }
  if (companyData.isSeal) {
    throw new Meteor.Error(403, `「${companyData.companyName}」公司已被金融管理委員會查封關停了！`);
  }
  checkPriceError(orderData, companyData);

  resourceManager.throwErrorIsResourceIsLock(['season', 'allCompanyOrders', `companyOrder${companyId}`, `user${userId}`]);
  // 先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('createSellOrder', [`companyOrder${companyId}`, `user${userId}`], (release) => {
    const directorData = dbDirectors.findOne({ companyId, userId }, {
      fields: {
        stocks: 1
      }
    });
    if (! directorData || directorData.stocks < orderData.amount) {
      throw new Meteor.Error(403, '擁有的股票數量不足，訂單無法成立！');
    }
    const existsBuyOrderCursor = dbOrders.find({
      companyId: companyId,
      userId: userId,
      orderType: '購入'
    });
    if (existsBuyOrderCursor.count() > 0) {
      throw new Meteor.Error(403, '有買入該公司股票的訂單正在執行中，無法同時下達賣出的訂單！');
    }
    const companyData = dbCompanies.findOne(companyId, {
      fields: {
        _id: 1,
        companyName: 1,
        listPrice: 1,
        lastPrice: 1,
        capital: 1,
        totalValue: 1,
        createdAt: 1
      }
    });
    if (! companyData) {
      throw new Meteor.Error(404, '不存在的公司股票，訂單無法成立！');
    }
    checkPriceError(orderData, companyData);

    createOrder({
      userId: userId,
      companyId: companyId,
      orderType: '賣出',
      unitPrice: orderData.unitPrice,
      amount: orderData.amount
    });
    release();
  });
}

function checkPriceError(orderData, companyData) {
  const priceLimits = getPriceLimits(companyData);
  if (orderData.unitPrice < priceLimits.lower) {
    throw new Meteor.Error(403, '每股單價不可低於該股票的跌停價格！');
  }
  if (orderData.unitPrice > priceLimits.upper) {
    throw new Meteor.Error(403, '每股單價不可大於該股票的漲停價格！');
  }
}

// 兩秒鐘最多一次
limitMethod('createSellOrder', 1, 2000);
