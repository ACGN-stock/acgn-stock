'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { resourceManager } from '../resourceManager';
import { dbCompanies } from '../../db/dbCompanies';
import { dbDirectors } from '../../db/dbDirectors';
import { dbOrders } from '../../db/dbOrders';
import { dbLog } from '../../db/dbLog';
import { dbVariables } from '../../db/dbVariables';
import { limitSubscription } from './rateLimit';
import { createOrder } from '../transaction';
import { debug } from '../debug';

Meteor.methods({
  createBuyOrder(orderData) {
    check(this.userId, String);
    check(orderData, {
      companyId: String,
      unitPrice: Match.Integer,
      amount: Match.Integer
    });
    createBuyOrder(Meteor.user(), orderData);

    return true;
  }
});
export function createBuyOrder(user, orderData) {
  debug.log('createBuyOrder', {user, orderData});
  if (user.profile.notPayTax) {
    throw new Meteor.Error(403, '您現在有稅單逾期未繳！');
  }
  if (_.contains(user.profile.ban, 'deal')) {
    throw new Meteor.Error(403, '您現在被金融管理會禁止了所有投資下單行為！');
  }
  if (orderData.unitPrice < 1) {
    throw new Meteor.Error(403, '購買單價不可小於1！');
  }
  if (orderData.amount < 1) {
    throw new Meteor.Error(403, '購買數量不可小於1！');
  }
  const totalCost = orderData.unitPrice * orderData.amount;
  if (user.profile.money < totalCost) {
    throw new Meteor.Error(403, '剩餘金錢不足，訂單無法成立！');
  }
  const companyId = orderData.companyId;
  const userId = user._id;
  const existsSellOrderCursor = dbOrders.find({
    companyId: companyId,
    userId: userId,
    orderType: '賣出'
  });
  if (existsSellOrderCursor.count() > 0) {
    throw new Meteor.Error(403, '有賣出該公司股票的訂單正在執行中，無法同時下達購買的訂單！');
  }
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      _id: 1,
      companyName: 1,
      listPrice: 1,
      lastPrice: 1,
      isSeal: 1
    }
  });
  if (! companyData) {
    throw new Meteor.Error(404, '不存在的公司股票，訂單無法成立！');
  }
  if (companyData.isSeal) {
    throw new Meteor.Error(403, '「' + companyData.companyName + '」公司已被金融管理委員會查封關停了！');
  }
  if (orderData.unitPrice < Math.max(Math.floor(companyData.listPrice * 0.85), 1)) {
    throw new Meteor.Error(403, '每股單價不可偏離該股票參考價格的百分之十五！');
  }
  if (companyData.listPrice < dbVariables.get('lowPriceThreshold')) {
    if (orderData.unitPrice > Math.ceil(companyData.listPrice * 1.3)) {
      throw new Meteor.Error(403, '每股單價不可高於該股票參考價格的百分之三十！');
    }
  }
  else if (orderData.unitPrice < Math.max(Math.floor(companyData.listPrice * 0.85), 1)) {
    throw new Meteor.Error(403, '每股單價不可偏離該股票參考價格的百分之十五！');
  }
  resourceManager.throwErrorIsResourceIsLock(['season', 'companyOrder' + companyId, 'user' + userId]);
  //先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('createBuyOrder', ['companyOrder' + companyId, 'user' + userId], (release) => {
    const user = Meteor.users.findOne(userId, {
      fields: {
        profile: 1
      }
    });
    const totalCost = orderData.unitPrice * orderData.amount;
    if (user.profile.money < totalCost) {
      throw new Meteor.Error(403, '剩餘金錢不足，訂單無法成立！');
    }
    const existsSellOrderCursor = dbOrders.find({
      companyId: companyId,
      userId: userId,
      orderType: '賣出'
    });
    if (existsSellOrderCursor.count() > 0) {
      throw new Meteor.Error(403, '有賣出該公司股票的訂單正在執行中，無法同時下達購買的訂單！');
    }
    const companyData = dbCompanies.findOne(companyId, {
      fields: {
        _id: 1,
        listPrice: 1,
        lastPrice: 1
      }
    });
    if (! companyData) {
      throw new Meteor.Error(404, '不存在的公司股票，訂單無法成立！');
    }
    if (orderData.unitPrice < Math.max(Math.floor(companyData.listPrice * 0.85), 1)) {
      throw new Meteor.Error(403, '每股單價不可偏離該股票參考價格的百分之十五！');
    }
    if (companyData.listPrice < dbVariables.get('lowPriceThreshold')) {
      if (orderData.unitPrice > Math.ceil(companyData.listPrice * 1.3)) {
        throw new Meteor.Error(403, '每股單價不可高於該股票參考價格的百分之三十！');
      }
    }
    else if (orderData.unitPrice < Math.max(Math.floor(companyData.listPrice * 0.85), 1)) {
      throw new Meteor.Error(403, '每股單價不可偏離該股票參考價格的百分之十五！');
    }
    createOrder({
      userId: userId,
      companyId: companyId,
      orderType: '購入',
      unitPrice: orderData.unitPrice,
      amount: orderData.amount
    });
    release();
  });
}

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
  debug.log('createSellOrder', {user, orderData});
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
  const directorData = dbDirectors.findOne({companyId, userId}, {
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
      isSeal: 1
    }
  });
  if (! companyData) {
    throw new Meteor.Error(404, '不存在的公司股票，訂單無法成立！');
  }
  if (companyData.isSeal) {
    throw new Meteor.Error(403, '「' + companyData.companyName + '」公司已被金融管理委員會查封關停了！');
  }
  if (orderData.unitPrice < Math.max(Math.floor(companyData.listPrice * 0.85), 1)) {
    throw new Meteor.Error(403, '每股單價不可偏離該股票參考價格的百分之十五！');
  }
  if (companyData.listPrice < dbVariables.get('lowPriceThreshold')) {
    if (orderData.unitPrice > Math.ceil(companyData.listPrice * 1.3)) {
      throw new Meteor.Error(403, '每股單價不可高於該股票參考價格的百分之三十！');
    }
  }
  else if (orderData.unitPrice < Math.max(Math.floor(companyData.listPrice * 0.85), 1)) {
    throw new Meteor.Error(403, '每股單價不可偏離該股票參考價格的百分之十五！');
  }
  resourceManager.throwErrorIsResourceIsLock(['season', 'companyOrder' + companyId, 'user' + userId]);
  //先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('createSellOrder', ['companyOrder' + companyId, 'user' + userId], (release) => {
    const directorData = dbDirectors.findOne({companyId, userId}, {
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
        lastPrice: 1
      }
    });
    if (! companyData) {
      throw new Meteor.Error(404, '不存在的公司股票，訂單無法成立！');
    }
    if (orderData.unitPrice < Math.max(Math.floor(companyData.listPrice * 0.85), 1)) {
      throw new Meteor.Error(403, '每股單價不可偏離該股票參考價格的百分之十五！');
    }
    if (companyData.listPrice < dbVariables.get('lowPriceThreshold')) {
      if (orderData.unitPrice > Math.ceil(companyData.listPrice * 1.3)) {
        throw new Meteor.Error(403, '每股單價不可高於該股票參考價格的百分之三十！');
      }
    }
    else if (orderData.unitPrice < Math.max(Math.floor(companyData.listPrice * 0.85), 1)) {
      throw new Meteor.Error(403, '每股單價不可偏離該股票參考價格的百分之十五！');
    }
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

Meteor.methods({
  retrieveOrder(orderId) {
    check(this.userId, String);
    check(orderId, String);
    retrieveOrder(Meteor.user(), orderId);

    return true;
  }
});
export function retrieveOrder(user, orderId) {
  debug.log('retrieveOrder', {user, orderId});
  if (user.profile.money < 1) {
    throw new Meteor.Error(403, '無法支付手續費1元，撤回訂單失敗！');
  }
  const orderData = dbOrders.findOne(orderId);
  if (! orderData) {
    throw new Meteor.Error(404, '訂單已完成或已撤回，撤回訂單失敗！');
  }
  const userId = user._id;
  if (userId !== orderData.userId) {
    throw new Meteor.Error(401, '該訂單並非使用者所有，撤回訂單失敗！');
  }
  const companyId = orderData.companyId;
  resourceManager.throwErrorIsResourceIsLock(['season', 'companyOrder' + companyId, 'user' + userId]);
  //先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('retrieveOrder', ['companyOrder' + companyId, 'user' + userId], (release) => {
    const user = Meteor.users.findOne(userId, {
      fields: {
        profile: 1
      }
    });
    if (user.profile.money < 1) {
      throw new Meteor.Error(403, '無法支付手續費1元，撤回訂單失敗！');
    }
    const orderData = dbOrders.findOne(orderId);
    if (! orderData) {
      throw new Meteor.Error(404, '訂單已完成或已撤回，撤回訂單失敗！');
    }
    const leftAmount = orderData.amount - orderData.done;
    const createdAt = new Date();
    dbLog.insert({
      logType: '取消下單',
      userId: [userId],
      companyId: companyId,
      price: orderData.unitPrice,
      amount: leftAmount,
      message: orderData.orderType,
      createdAt: createdAt
    });
    let increaseMoney = -1;
    if (orderData.orderType === '購入') {
      increaseMoney += (orderData.unitPrice * (orderData.amount - orderData.done));
    }
    else {
      const existsDirectorsData = dbDirectors.findOne({companyId, userId}, {
        fields: {
          _id: 1
        }
      });
      if (existsDirectorsData) {
        dbDirectors.update(existsDirectorsData._id, {
          $inc: {
            stocks: leftAmount
          }
        });
      }
      else {
        dbDirectors.insert({
          companyId: companyId,
          userId: userId,
          stocks: leftAmount,
          createdAt: createdAt
        });
      }
    }
    Meteor.users.update(userId, {
      $inc: {
        'profile.money': increaseMoney
      }
    });
    dbOrders.remove(orderData._id);
    release();
  });
}

Meteor.publish('queryMyOrder', function() {
  debug.log('publish queryMyOrder');
  const userId = this.userId;
  if (userId) {
    return dbOrders.find({userId});
  }

  return [];
});
//一分鐘最多30次
limitSubscription('queryMyOrder', 30);

Meteor.publish('companyOrderExcludeMe', function(companyId, type, offset) {
  debug.log('publish companyOrderExcludeMe', {companyId, type, offset});
  check(companyId, String);
  check(type, new Match.OneOf('購入', '賣出'));
  check(offset, Match.Integer);

  const filter = {
    companyId: companyId,
    orderType: type
  };
  const userId = this.userId;
  if (userId) {
    filter.userId = {
      $ne: userId
    };
  }

  const variableId = 'totalCountOfCompanyOrder' + type;
  let initialized = false;
  let total = dbOrders.find(filter).count();
  this.added('variables', variableId, {
    value: total
  });

  const observer = dbOrders.find(filter, {
      sort: {
        unitPrice: type === '賣出' ? 1 : -1
      },
      skip: offset,
      limit: 10,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('orders', id, fields);
        if (initialized) {
          total += 1;
          this.changed('variables', variableId, {
            value: total
          });
        }
      },
      changed: (id, fields) => {
        this.changed('orders', id, fields);
      },
      removed: (id) => {
        this.removed('orders', id);
        if (initialized) {
          total -= 1;
          this.changed('variables', variableId, {
            value: total
          });
        }
      }
    });
  initialized = true;
  this.ready();
  this.onStop(() => {
    observer.stop();
  });
});
//一分鐘最多20次
limitSubscription('companyOrderExcludeMe');
