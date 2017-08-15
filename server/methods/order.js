'use strict';
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
      companyName: String,
      unitPrice: Match.Integer,
      amount: Match.Integer
    });
    createBuyOrder(Meteor.user(), orderData);

    return true;
  }
});
export function createBuyOrder(user, orderData) {
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
  const companyName = orderData.companyName;
  const username = user.username;
  const existsSellOrder = dbOrders.findOne({
    companyName: companyName,
    username: username,
    orderType: '賣出'
  });
  if (existsSellOrder) {
    throw new Meteor.Error(403, '有賣出該公司股票的訂單正在執行中，無法同時下達購買的訂單！');
  }
  const companyData = dbCompanies.findOne({companyName}, {
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
  if (orderData.unitPrice < (companyData.listPrice / 2)) {
    throw new Meteor.Error(403, '最低買入價格不可低於該股票參考價格的一半！');
  }
  if (orderData.unitPrice > (companyData.listPrice * 2)) {
    throw new Meteor.Error(403, '最高買入價格不可高於該股票參考價格的兩倍！');
  }
  resourceManager.throwErrorIsResourceIsLock(['season', 'companyOrder' + companyName, 'user' + username]);
  //先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('createBuyOrder', ['companyOrder' + companyName, 'user' + username], (release) => {
    const user = Meteor.users.findOne({username}, {
      fields: {
        username: 1,
        profile: 1
      }
    });
    const totalCost = orderData.unitPrice * orderData.amount;
    if (user.profile.money < totalCost) {
      throw new Meteor.Error(403, '剩餘金錢不足，訂單無法成立！');
    }
    const existsSellOrder = dbOrders.findOne({
      companyName: companyName,
      username: username,
      orderType: '賣出'
    });
    if (existsSellOrder) {
      throw new Meteor.Error(403, '有賣出該公司股票的訂單正在執行中，無法同時下達購買的訂單！');
    }
    const companyData = dbCompanies.findOne({companyName}, {
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
    if (orderData.unitPrice < (companyData.listPrice / 2)) {
      throw new Meteor.Error(403, '最低買入價格不可低於該股票參考價格的一半！');
    }
    if (orderData.unitPrice > (companyData.listPrice * 2)) {
      throw new Meteor.Error(403, '最高買入價格不可高於該股票參考價格的兩倍！');
    }
    orderData.username = username;
    orderData.orderType = '購入';
    orderData.createdAt = new Date();
    orderData.done = 0;
    dbLog.insert({
      logType: '購買下單',
      username: [username],
      companyName: companyName,
      price: orderData.unitPrice,
      amount: orderData.amount,
      createdAt: new Date()
    });
    let indeedCost = 0;
    let lastPrice = companyData.lastPrice;
    dbOrders
      .find(
        {
          companyName: companyName,
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
          orderData.done += tradeNumber;
          lastPrice = sellOrderData.unitPrice;
          indeedCost += (lastPrice * tradeNumber);
          changeStocksAmount(username, companyName, tradeNumber);
          if (sellOrderData.username === '!system') {
            dbLog.insert({
              logType: '交易紀錄',
              username: [username],
              companyName: companyName,
              price: lastPrice,
              amount: tradeNumber,
              createdAt: new Date()
            });
            dbCompanies.update({companyName}, {
              $inc: {
                profit: lastPrice * tradeNumber
              }
            });
          }
          else {
            const sellerUsername = sellOrderData.username;
            dbLog.insert({
              logType: '交易紀錄',
              username: [username, sellerUsername],
              companyName: companyName,
              price: lastPrice,
              amount: tradeNumber,
              createdAt: new Date()
            });
            Meteor.users.update(
              {
                username: sellerUsername
              },
              {
                $inc: {
                  'profile.money': lastPrice * tradeNumber
                }
              }
            );
          }
        }
        resolveOrder(sellOrderData, tradeNumber);
      });
    updateCompanyLastPrice(companyData, lastPrice);
    if (orderData.done < orderData.amount) {
      const leftAmount = orderData.amount - orderData.done;
      const leftCost = leftAmount * orderData.unitPrice;
      Meteor.users.update(user._id, {
        $inc: {
          'profile.money': (indeedCost + leftCost) * -1
        }
      });
      dbOrders.insert(orderData);
    }
    else {
      dbLog.insert({
        logType: '訂單完成',
        username: [username],
        companyName: orderData.companyName,
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
      companyName: String,
      unitPrice: Match.Integer,
      amount: Match.Integer
    });
    createSellOrder(Meteor.user(), orderData);

    return true;
  }
});
export function createSellOrder(user, orderData) {
  if (orderData.unitPrice < 1) {
    throw new Meteor.Error(403, '販賣單價不可小於1！');
  }
  if (orderData.amount < 1) {
    throw new Meteor.Error(403, '販賣數量不可小於1！');
  }
  const username = user.username;
  const companyName = orderData.companyName;
  const existsBuyOrder = dbOrders.findOne({
    companyName: companyName,
    username: username,
    orderType: '購入'
  });
  if (existsBuyOrder) {
    throw new Meteor.Error(403, '有買入該公司股票的訂單正在執行中，無法同時下達賣出的訂單！');
  }
  const directorData = dbDirectors.findOne({companyName, username}, {
    fields: {
      stocks: 1
    }
  });
  if (! directorData || directorData.stocks < orderData.amount) {
    throw new Meteor.Error(403, '擁有的股票數量不足，訂單無法成立！');
  }
  const companyData = dbCompanies.findOne({companyName}, {
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
  if (orderData.unitPrice < (companyData.listPrice / 2)) {
    throw new Meteor.Error(403, '最低售出價格不可低於該股票參考價格的一半！');
  }
  if (orderData.unitPrice > (companyData.listPrice * 2)) {
    throw new Meteor.Error(403, '最高售出價格不可高於該股票參考價格的兩倍！');
  }
  resourceManager.throwErrorIsResourceIsLock(['season', 'companyOrder' + companyName]);
  //先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('createSellOrder', ['companyOrder' + companyName], (release) => {
    const directorData = dbDirectors.findOne({companyName, username}, {
      fields: {
        stocks: 1
      }
    });
    if (! directorData || directorData.stocks < orderData.amount) {
      throw new Meteor.Error(403, '擁有的股票數量不足，訂單無法成立！');
    }
    const existsBuyOrder = dbOrders.findOne({
      companyName: companyName,
      username: username,
      orderType: '購入'
    });
    if (existsBuyOrder) {
      throw new Meteor.Error(403, '有買入該公司股票的訂單正在執行中，無法同時下達賣出的訂單！');
    }
    const companyData = dbCompanies.findOne({companyName}, {
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
    if (orderData.unitPrice < (companyData.listPrice / 2)) {
      throw new Meteor.Error(403, '最低售出價格不可低於該股票參考價格的一半！');
    }
    if (orderData.unitPrice > (companyData.listPrice * 2)) {
      throw new Meteor.Error(403, '最高售出價格不可高於該股票參考價格的兩倍！');
    }
    orderData.username = username;
    orderData.orderType = '賣出';
    orderData.createdAt = new Date();
    orderData.done = 0;
    dbLog.insert({
      logType: '販賣下單',
      username: [username],
      companyName: companyName,
      price: orderData.unitPrice,
      amount: orderData.amount,
      createdAt: new Date()
    });
    changeStocksAmount(username, companyName, orderData.amount * -1);
    let lastPrice = companyData.lastPrice;
    dbOrders
      .find(
        {
          companyName: companyName,
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
          orderData.done += tradeNumber;
          lastPrice = buyOrderData.unitPrice;
          dbLog.insert({
            logType: '交易紀錄',
            username: [buyOrderData.username, username],
            companyName: companyName,
            price: lastPrice,
            amount: tradeNumber,
            createdAt: new Date()
          });
          changeStocksAmount(buyOrderData.username, companyName, tradeNumber);
          Meteor.users.update({username}, {
            $inc: {
              'profile.money': lastPrice * tradeNumber
            }
          });
        }
        resolveOrder(buyOrderData, tradeNumber);
      });
    updateCompanyLastPrice(companyData, lastPrice);
    if (orderData.done < orderData.amount) {
      dbOrders.insert(orderData);
    }
    else {
      dbLog.insert({
        logType: '訂單完成',
        username: [username],
        companyName: orderData.companyName,
        price: orderData.unitPrice,
        amount: orderData.amount,
        message: orderData.orderType,
        createdAt: new Date()
      });
    }
    release();
  });
}

export function changeStocksAmount(username, companyName, amount) {
  const existDirectorData = dbDirectors.findOne({
    companyName: companyName,
    username: username
  });
  if (amount > 0) {
    if (existDirectorData) {
      dbDirectors.update(
        {
          _id: existDirectorData._id
        },
        {
          $inc: {
            stocks: amount
          }
        }
      );
    }
    else {
      dbDirectors.insert({
        companyName: companyName,
        username: username,
        stocks: amount,
        createdAt: new Date()
      });
    }
  }
  else {
    if (existDirectorData) {
      amount *= -1;
      if (existDirectorData.stocks > amount) {
        dbDirectors.update(
          {
            _id: existDirectorData._id
          },
          {
            $inc: {
              stocks: amount * -1
            }
          }
        );
      }
      else if (existDirectorData.stocks === amount) {
        dbDirectors.remove(existDirectorData._id);
        dbProductLike.find({companyName, username}).forEach((likeData) => {
          dbProducts.update(likeData.productId, {
            $inc: {
              likeCount: -1
            }
          });
          dbProductLike.remove(likeData._id);
        });
      }
      else {
        throw new Meteor.Error(500, '試圖扣除使用者[' + username + ']股票[' + companyName + ']數量[' + amount + ']但數量不足！');
      }
    }
    else {
      throw new Meteor.Error(500, '試圖扣除不存在的使用者[' + username + ']股票[' + companyName + ']數量[' + amount + ']！');
    }
  }
}

export function resolveOrder(orderData, done) {
  if (done <= 0) {
    return false;
  }
  const finalDone = orderData.done + done;
  if (finalDone === orderData.amount) {
    const orderUserName = orderData.username === '!system' ? orderData.companyName : orderData.username;
    dbLog.insert({
      logType: '訂單完成',
      username: [orderUserName],
      companyName: orderData.companyName,
      price: orderData.unitPrice,
      amount: orderData.amount,
      message: orderData.orderType,
      createdAt: new Date()
    });
    dbOrders.remove({
      _id: orderData._id
    });
  }
  else if (finalDone < orderData.amount) {
    dbOrders.update(orderData._id, {
      $set: {
        done: finalDone
      }
    });
  }
  else {
    throw new Meteor.Error(500, '試圖完成的股票交易數量[' + done + ']大於使用者[' + orderData.username + ']股票[' + orderData.companyName + ']的未完成數量[' + (orderData.amount - orderData.done) + ']！');
  }
}

export function updateCompanyLastPrice(companyData, lastPrice) {
  if (companyData.lastPrice !== lastPrice) {
    dbCompanies.update(companyData._id, {
      $set: {
        lastPrice: lastPrice
      }
    });
  }
  const companyName = companyData.companyName;
  dbPrice.insert({
    companyName: companyName,
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
  const username = user.username;
  if (username !== orderData.username) {
    throw new Meteor.Error(401, '該訂單並非使用者所有，撤回訂單失敗！');
  }
  const companyName = orderData.companyName;
  resourceManager.throwErrorIsResourceIsLock(['season', 'companyOrder' + companyName, 'user' + username]);
  //先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('retrieveOrder', ['companyOrder' + companyName, 'user' + username], (release) => {
    const user = Meteor.users.findOne({username}, {
      fields: {
        username: 1,
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
      username: [username],
      companyName: companyName,
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
      changeStocksAmount(username, companyName, leftAmount);
    }
    Meteor.users.update({username}, {
      $inc: {
        'profile.money': increaseMoney
      }
    });
    dbOrders.remove({
      _id: orderData._id
    });
    release();
  });
}
