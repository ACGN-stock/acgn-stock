'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { resourceManager } from '../resourceManager';
import { dbCompanies } from '../../db/dbCompanies';
import { dbDirectors } from '../../db/dbDirectors';
import { dbOrders } from '../../db/dbOrders';
import { dbPrice } from '../../db/dbPrice';
import { dbProducts } from '../../db/dbProducts';
import { dbProductLike } from '../../db/dbProductLike';
import { dbLog } from '../../db/dbLog';

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
      lastPrice: 1
    }
  });
  if (! companyData) {
    throw new Meteor.Error(404, '不存在的公司股票，訂單無法成立！');
  }
  if (companyData.isSeal) {
    throw new Meteor.Error(403, '「' + companyData.companyName + '」公司已被金融管理委員會查封關停了，無法下達訂單！');
  }
  if (orderData.unitPrice < Math.max(companyData.listPrice * 0.85, 1)) {
    throw new Meteor.Error(403, '最低售出價格不可低於該股票參考價格的百分之八十五！');
  }
  if (orderData.unitPrice > (companyData.listPrice * 1.15)) {
    throw new Meteor.Error(403, '最高買入價格不可高於該股票參考價格的一點一五倍！');
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
    if (orderData.unitPrice < Math.max(companyData.listPrice * 0.85, 1)) {
      throw new Meteor.Error(403, '最低售出價格不可低於該股票參考價格的百分之八十五！');
    }
    if (orderData.unitPrice > (companyData.listPrice * 1.15)) {
      throw new Meteor.Error(403, '最高買入價格不可高於該股票參考價格的一點一五倍！');
    }
    orderData.userId = userId;
    orderData.orderType = '購入';
    orderData.createdAt = new Date();
    orderData.done = 0;
    dbLog.insert({
      logType: '購買下單',
      userId: [userId],
      companyId: companyId,
      price: orderData.unitPrice,
      amount: orderData.amount,
      createdAt: new Date()
    });
    let indeedCost = 0;
    let lastPrice = companyData.lastPrice;
    let anyTradeDone = false;
    dbOrders
      .find(
        {
          companyId: companyId,
          orderType: '賣出',
          unitPrice: {
            $lte: orderData.unitPrice
          }
        },
        {
          sort: {
            unitPrice: 1,
            createdAt: 1
          },
          disableOplog: true
        }
      )
      .forEach((sellOrderData) => {
        if (orderData.done >= orderData.amount) {
          return true;
        }
        const tradeNumber = Math.min(sellOrderData.amount - sellOrderData.done, orderData.amount - orderData.done);
        if (tradeNumber > 0) {
          anyTradeDone = true;
          orderData.done += tradeNumber;
          lastPrice = sellOrderData.unitPrice;
          indeedCost += (lastPrice * tradeNumber);
          changeStocksAmount(userId, companyId, tradeNumber);
          if (sellOrderData.userId === '!system') {
            dbLog.insert({
              logType: '交易紀錄',
              userId: [userId],
              companyId: companyId,
              price: lastPrice,
              amount: tradeNumber,
              createdAt: new Date()
            });
            dbCompanies.update(companyId, {
              $inc: {
                profit: lastPrice * tradeNumber
              }
            });
          }
          else {
            const sellerUserId = sellOrderData.userId;
            dbLog.insert({
              logType: '交易紀錄',
              userId: [userId, sellerUserId],
              companyId: companyId,
              price: lastPrice,
              amount: tradeNumber,
              createdAt: new Date()
            });
            Meteor.users.update(sellerUserId, {
              $inc: {
                'profile.money': lastPrice * tradeNumber
              }
            });
          }
        }
        resolveOrder(sellOrderData, tradeNumber);
      });
    if (anyTradeDone) {
      updateCompanyLastPrice(companyData, lastPrice);
    }
    if (orderData.done < orderData.amount) {
      const leftAmount = orderData.amount - orderData.done;
      const leftCost = leftAmount * orderData.unitPrice;
      Meteor.users.update(userId, {
        $inc: {
          'profile.money': (indeedCost + leftCost) * -1
        }
      });
      dbOrders.insert(orderData);
    }
    else {
      dbLog.insert({
        logType: '訂單完成',
        userId: [userId],
        companyId: companyId,
        price: orderData.unitPrice,
        amount: orderData.amount,
        message: orderData.orderType,
        createdAt: new Date()
      });
      Meteor.users.update(user._id, {
        $inc: {
          'profile.money': indeedCost * -1
        }
      });
    }
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
      lastPrice: 1
    }
  });
  if (! companyData) {
    throw new Meteor.Error(404, '不存在的公司股票，訂單無法成立！');
  }
  if (companyData.isSeal) {
    throw new Meteor.Error(403, '「' + companyData.companyName + '」公司已被金融管理委員會查封關停了，無法下達訂單！');
  }
  if (orderData.unitPrice < Math.max(companyData.listPrice * 0.85, 1)) {
    throw new Meteor.Error(403, '最低售出價格不可低於該股票參考價格的百分之八十五！');
  }
  if (orderData.unitPrice > (companyData.listPrice * 1.15)) {
    throw new Meteor.Error(403, '最高買入價格不可高於該股票參考價格的一點一五倍！');
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
    if (orderData.unitPrice < Math.max(companyData.listPrice * 0.85, 1)) {
      throw new Meteor.Error(403, '最低售出價格不可低於該股票參考價格的百分之八十五！');
    }
    if (orderData.unitPrice > (companyData.listPrice * 1.15)) {
      throw new Meteor.Error(403, '最高買入價格不可高於該股票參考價格的一點一五倍！');
    }
    orderData.userId = userId;
    orderData.orderType = '賣出';
    orderData.createdAt = new Date();
    orderData.done = 0;
    dbLog.insert({
      logType: '販賣下單',
      userId: [userId],
      companyId: companyId,
      price: orderData.unitPrice,
      amount: orderData.amount,
      createdAt: new Date()
    });
    changeStocksAmount(userId, companyId, orderData.amount * -1);
    let lastPrice = companyData.lastPrice;
    let anyTradeDone = false;
    dbOrders
      .find(
        {
          companyId: companyId,
          orderType: '購入',
          unitPrice: {
            $gte: orderData.unitPrice
          }
        },
        {
          sort: {
            unitPrice: -1,
            createdAt: 1
          },
          disableOplog: true
        }
      )
      .forEach((buyOrderData) => {
        if (orderData.done >= orderData.amount) {
          return true;
        }
        const tradeNumber = Math.min(buyOrderData.amount - buyOrderData.done, orderData.amount - orderData.done);
        if (tradeNumber > 0) {
          anyTradeDone = true;
          orderData.done += tradeNumber;
          lastPrice = buyOrderData.unitPrice;
          dbLog.insert({
            logType: '交易紀錄',
            userId: [buyOrderData.userId, userId],
            companyId: companyId,
            price: lastPrice,
            amount: tradeNumber,
            createdAt: new Date()
          });
          changeStocksAmount(buyOrderData.userId, companyId, tradeNumber);
          Meteor.users.update(userId, {
            $inc: {
              'profile.money': lastPrice * tradeNumber
            }
          });
        }
        resolveOrder(buyOrderData, tradeNumber);
      });
    if (anyTradeDone) {
      updateCompanyLastPrice(companyData, lastPrice);
    }
    if (orderData.done < orderData.amount) {
      dbOrders.insert(orderData);
    }
    else {
      dbLog.insert({
        logType: '訂單完成',
        userId: [userId],
        companyId: orderData.companyId,
        price: orderData.unitPrice,
        amount: orderData.amount,
        message: orderData.orderType,
        createdAt: new Date()
      });
    }
    release();
  });
}

export function changeStocksAmount(userId, companyId, amount) {
  const existDirectorData = dbDirectors.findOne({companyId, userId});
  if (amount > 0) {
    if (existDirectorData) {
      dbDirectors.update(existDirectorData._id, {
        $inc: {
          stocks: amount
        }
      });
    }
    else {
      dbDirectors.insert({
        companyId: companyId,
        userId: userId,
        stocks: amount,
        createdAt: new Date()
      });
    }
  }
  else {
    if (existDirectorData) {
      amount *= -1;
      if (existDirectorData.stocks > amount) {
        dbDirectors.update(existDirectorData._id, {
          $inc: {
            stocks: amount * -1
          }
        });
      }
      else if (existDirectorData.stocks === amount) {
        dbDirectors.remove(existDirectorData._id);
        dbProductLike.find({companyId, userId}).forEach((likeData) => {
          dbProducts.update(likeData.productId, {
            $inc: {
              likeCount: -1
            }
          });
          dbProductLike.remove(likeData._id);
        });
      }
      else {
        throw new Meteor.Error(500, '試圖扣除使用者[' + userId + ']股票[' + companyId + ']數量[' + amount + ']但數量不足！');
      }
    }
    else {
      throw new Meteor.Error(500, '試圖扣除不存在的使用者[' + userId + ']股票[' + companyId + ']數量[' + amount + ']！');
    }
  }
}

export function resolveOrder(orderData, done) {
  if (done <= 0) {
    return false;
  }
  const finalDone = orderData.done + done;
  if (finalDone === orderData.amount) {
    dbLog.insert({
      logType: '訂單完成',
      userId: [orderData.userId],
      companyId: orderData.companyId,
      price: orderData.unitPrice,
      amount: orderData.amount,
      message: orderData.orderType,
      createdAt: new Date()
    });
    dbOrders.remove(orderData._id);
  }
  else if (finalDone < orderData.amount) {
    dbOrders.update(orderData._id, {
      $set: {
        done: finalDone
      }
    });
  }
  else {
    throw new Meteor.Error(500, '試圖完成的股票交易數量[' + done + ']大於使用者[' + orderData.userId + ']股票[' + orderData.companyName + ']的未完成數量[' + (orderData.amount - orderData.done) + ']！');
  }
}

export function updateCompanyLastPrice(companyData, lastPrice) {
  const companyId = companyData._id;
  if (companyData.lastPrice !== lastPrice) {
    dbCompanies.update(companyId, {
      $set: {
        lastPrice: lastPrice
      }
    });
  }
  dbPrice.insert({
    companyId: companyId,
    price: lastPrice,
    createdAt: new Date()
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
    dbLog.insert({
      logType: '取消下單',
      userId: [userId],
      companyId: companyId,
      price: orderData.unitPrice,
      amount: leftAmount,
      message: orderData.orderType,
      createdAt: new Date()
    });
    let increaseMoney = -1;
    if (orderData.orderType === '購入') {
      increaseMoney += (orderData.unitPrice * (orderData.amount - orderData.done));
    }
    else {
      changeStocksAmount(userId, companyId, leftAmount);
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
