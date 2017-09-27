'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { dbCompanies } from '../db/dbCompanies';
import { dbDirectors } from '../db/dbDirectors';
import { dbLog } from '../db/dbLog';
import { dbOrders } from '../db/dbOrders';
import { dbPrice } from '../db/dbPrice';
import { debug } from './debug';

export function createOrder(orderData) {
  debug.log('createOrder', orderData);
  orderData.done = 0;
  orderData.createdAt = new Date();

  //產生各資料庫的unordered bulk op工具
  const tradeTools = generateTradeTools(orderData);

  //寫入下單紀錄到unordered bulk op
  if (orderData.userId === '!system') {
    tradeTools.logBulk.insert({
      logType: '公司釋股',
      companyId: orderData.companyId,
      price: orderData.unitPrice,
      amount: orderData.amount,
      createdAt: tradeTools.createdAt
    });
    tradeTools.companiesBulk
      .find({
        _id: orderData.companyId
      })
      .updateOne({
        $inc: {
          totalRelease: orderData.amount
        }
      });
  }
  else {
    tradeTools.logBulk.insert({
      logType: (orderData.orderType === '購入') ? '購買下單' : '販賣下單',
      userId: [orderData.userId],
      companyId: orderData.companyId,
      price: orderData.unitPrice,
      amount: orderData.amount,
      createdAt: tradeTools.createdAt
    });
  }

  //計算此筆新訂單會立刻產生的交易，並同步修改orderData的done數值
  const tradeList = generateInstantTradeList(orderData);
  //對立即產生的交易進行處理，並寫入unordered bulk op
  resolveInstantTradeList(orderData.companyId, tradeList, tradeTools);
  //若為賣出訂單，則扣除買入者的金錢，寫入unordered bulk op
  if (orderData.orderType === '購入') {
    decreaseUserMoneyByTradeList(orderData.userId, tradeList, tradeTools);
  }
  //若為非系統的賣出訂單，則扣除賣出者的持有股份，寫入unordered bulk op
  else if (orderData.userId !== '!system') {
    decreaseUserStocks(orderData, tradeTools);
  }
  //若訂單尚未完成
  if (orderData.done < orderData.amount) {
    //將剩餘訂單資料插入資料庫(由於dbOrders主鍵並非Mongo Object ID，此處不可使用bulk)
    dbOrders.insert(orderData);
    //若為買入訂單，則扣除買入者剩餘訂單的花費，並寫入unordered bulk op
    if (orderData.orderType === '購入') {
      tradeTools.usersBulk
        .find({
          _id: orderData.userId
        })
        .updateOne({
          $inc: {
            'profile.money': -1 * (orderData.unitPrice * (orderData.amount - orderData.done))
          }
        });
    }
  }
  //否則將訂單完成紀錄寫入unordered bulk op
  else {
    tradeTools.logBulk.insert({
      logType: '訂單完成',
      userId: [orderData.userId],
      companyId: orderData.companyId,
      price: orderData.unitPrice,
      amount: orderData.amount,
      message: orderData.orderType,
      createdAt: new Date(orderData.createdAt.getTime() + (tradeList.length * 2) + 1)
    });
  }
  //無論什麼單都會將log unordered bulk op的資料寫入資料庫
  tradeTools.logBulk.execute();
  //如有任何立即產生的交易
  if (tradeList.length > 0) {
    const lastTradeData = _.last(tradeList);
    //更新公司最後成交價格
    tradeTools.companiesBulk
      .find({
        _id: orderData.companyId
      })
      .updateOne({
        $set: {
          lastPrice: lastTradeData.price
        }
      });
    //將公司最後成交價格寫入price unordered bulk op
    tradeTools.priceBulk.insert({
      companyId: orderData.companyId,
      price: lastTradeData.price,
      createdAt: orderData.createdAt
    });
    //將companiesBulk/users/directors/order/price/users unordered bulk op的資料寫入資料庫
    tradeTools.companiesBulk.execute();
    tradeTools.directorsBulk.execute();
    tradeTools.ordersBulk.execute();
    tradeTools.priceBulk.execute();
    //系統或金管會釋股時，沒有使用者的金錢資料需要寫入資料庫
    if (orderData.userId !== '!system' && orderData.userId !== '!FSC') {
      tradeTools.usersBulk.execute();
    }
  }
  //否則若為買入訂單，將users unordered bulk op的資料寫入資料庫
  else if (orderData.orderType === '購入') {
    tradeTools.usersBulk.execute();
  }
  //否則若為系統釋股單，將companiesBulk unordered bulk op的資料寫入資料庫
  else if (orderData.userId === '!system') {
    tradeTools.companiesBulk.execute();
  }
  //否則為賣出訂單，將directors unordered bulk op的資料寫入資料庫
  else {
    tradeTools.directorsBulk.execute();
  }
}

function generateTradeTools(orderData) {
  debug.log('generateTradeTools', orderData);
  const result = {
    companiesBulk: dbCompanies.rawCollection().initializeUnorderedBulkOp(),
    directorsBulk: dbDirectors.rawCollection().initializeUnorderedBulkOp(),
    logBulk: dbLog.rawCollection().initializeUnorderedBulkOp(),
    ordersBulk: dbOrders.rawCollection().initializeUnorderedBulkOp(),
    priceBulk: dbPrice.rawCollection().initializeUnorderedBulkOp(),
    usersBulk: Meteor.users.rawCollection().initializeUnorderedBulkOp()
  };
  _.each(result, (bulk) => {
    bulk.execute = Meteor.wrapAsync(bulk.execute);
  });
  result.createdAt = orderData.createdAt;

  return result;
}

function generateInstantTradeList(orderData) {
  debug.log('generateInstantTradeList', orderData);
  const tradeList = [];
  if (orderData.orderType === '購入') {
    dbOrders
      .find(
        {
          companyId: orderData.companyId,
          orderType: '賣出',
          unitPrice: {
            $lte: orderData.unitPrice
          }
        },
        {
          sort: {
            unitPrice: 1,
            createdAt: 1
          }
        }
      )
      .forEach((sellOrderData) => {
        if (orderData.done >= orderData.amount) {
          return true;
        }
        const tradeNumber = Math.min(sellOrderData.amount - sellOrderData.done, orderData.amount - orderData.done);
        if (tradeNumber > 0) {
          orderData.done += tradeNumber;
          tradeList.push({
            buyerId: orderData.userId,
            sellerId: sellOrderData.userId,
            companyId: orderData.companyId,
            resolveOrderId: sellOrderData._id,
            removeOrder: (sellOrderData.done + tradeNumber === sellOrderData.amount),
            price: sellOrderData.unitPrice,
            amount: tradeNumber
          });
        }
      });
  }
  else {
    dbOrders
      .find(
        {
          companyId: orderData.companyId,
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
          fields: {
            _id: 1,
            userId: 1,
            unitPrice: 1,
            amount: 1,
            done: 1
          }
        }
      )
      .forEach((buyOrderData) => {
        if (orderData.done >= orderData.amount) {
          return true;
        }
        const tradeNumber = Math.min(buyOrderData.amount - buyOrderData.done, orderData.amount - orderData.done);
        if (tradeNumber > 0) {
          orderData.done += tradeNumber;
          tradeList.push({
            buyerId: buyOrderData.userId,
            sellerId: orderData.userId,
            companyId: orderData.companyId,
            resolveOrderId: buyOrderData._id,
            removeOrder: (buyOrderData.done + tradeNumber === buyOrderData.amount),
            price: buyOrderData.unitPrice,
            amount: tradeNumber
          });
        }
      });
  }

  return tradeList;
}

function resolveInstantTradeList(companyId, tradeList, tradeTools) {
  debug.log('resolveInstantTradeList', {companyId, tradeList});
  const basicCreatedAtTime = tradeTools.createdAt.getTime();

  //紀錄整個交易過程裡股份有增加的userId及增加量
  const increaseStocksHash = {};
  //紀錄整個交易過程裡金錢有增加的userId及增加量
  const increaseMoneyHash = {};
  //生成交易紀錄並寫入unordered bulk op中
  _.each(tradeList, (tradeData, index) => {
    //計算交易紀錄中的userId欄位
    const buyerId = tradeData.buyerId;
    const sellerId = tradeData.sellerId;
    const logUserId = [buyerId];
    if (sellerId !== '!system') {
      logUserId.push(sellerId);
    }
    //寫入交易紀錄
    tradeTools.logBulk.insert({
      logType: '交易紀錄',
      userId: logUserId,
      companyId: companyId,
      price: tradeData.price,
      amount: tradeData.amount,
      createdAt: new Date(basicCreatedAtTime + (index * 2) + 1)
    });
    //記錄誰的股份有增加
    if (increaseStocksHash[buyerId] === undefined) {
      increaseStocksHash[buyerId] = 0;
    }
    increaseStocksHash[buyerId] += tradeData.amount;
    //記錄誰的金錢有增加
    if (increaseMoneyHash[sellerId] === undefined) {
      increaseMoneyHash[sellerId] = 0;
    }
    increaseMoneyHash[sellerId] += (tradeData.amount * tradeData.price);
    //刪除或修改訂單
    if (tradeData.removeOrder) {
      const removeOrderData = dbOrders.findOne(tradeData.resolveOrderId);
      tradeTools.ordersBulk
        .find({
          _id: removeOrderData._id
        })
        .removeOne();
      tradeTools.logBulk.insert({
        logType: '訂單完成',
        userId: [removeOrderData.userId],
        companyId: removeOrderData.companyId,
        price: removeOrderData.unitPrice,
        amount: removeOrderData.amount,
        message: removeOrderData.orderType,
        createdAt: new Date(basicCreatedAtTime + (index * 2) + 2)
      });
    }
    else {
      tradeTools.ordersBulk
        .find({
          _id: tradeData.resolveOrderId
        })
        .updateOne({
          $inc: {
            done: tradeData.amount
          }
        });
    }
  });
  //依increaseStocksHash，將股份的變動寫入unordered bulk op中
  let index = 0;
  _.each(increaseStocksHash, (amount, userId) => {
    if (dbDirectors.find({companyId, userId}).count() > 0) {
      //由於directors主鍵為Mongo Object ID，在Bulk進行find會有問題，故以companyId+userId進行搜尋更新
      tradeTools.directorsBulk
        .find({companyId, userId})
        .updateOne({
          $inc: {
            stocks: amount
          }
        });
    }
    else {
      tradeTools.directorsBulk.insert({
        companyId: companyId,
        userId: userId,
        stocks: amount,
        createdAt: new Date(basicCreatedAtTime + index)
      });
      index += 1;
    }
  });
  //依increaseMoneyHash，將金錢的變動寫入unordered bulk op中
  _.each(increaseMoneyHash, (money, userId) => {
    if (userId === '!system') {
      tradeTools.companiesBulk
        .find({
          _id: companyId
        })
        .updateOne({
          $inc: {
            profit: money
          }
        });
    }
    else {
      tradeTools.usersBulk
        .find({
          _id: userId
        })
        .updateOne({
          $inc: {
            'profile.money': money
          }
        });
    }
  });
}

function decreaseUserMoneyByTradeList(userId, tradeList, tradeTools) {
  debug.log('decreaseUserMoneyByTradeList', {userId, tradeList});
  const totalCost = _.reduce(tradeList, (totalCost, tradeData) => {
    return totalCost + (tradeData.amount * tradeData.price);
  }, 0);
  tradeTools.usersBulk
    .find({
      _id: userId
    })
    .updateOne({
      $inc: {
        'profile.money': -1 * totalCost
      }
    });
}

function decreaseUserStocks(orderData, tradeTools) {
  debug.log('decreaseUserStocks', orderData);
  const {companyId, userId, amount} = orderData;
  const existDirectorData = dbDirectors.findOne({companyId, userId}, {
    fields: {
      _id: 1,
      stocks: 1
    }
  });
  if (existDirectorData) {
    if (existDirectorData.stocks > amount) {
      //由於directors主鍵為Mongo Object ID，在Bulk進行find會有問題，故以companyId+userId進行搜尋更新
      tradeTools.directorsBulk
        .find({companyId, userId})
        .updateOne({
          $inc: {
            stocks: -1 * amount
          }
        });
    }
    else if (existDirectorData.stocks === amount) {
      //由於directors主鍵為Mongo Object ID，在Bulk進行find會有問題，故以companyId+userId進行搜尋更新
      tradeTools.directorsBulk
        .find({companyId, userId})
        .removeOne();
    }
    else {
      throw new Meteor.Error(500, '試圖扣除使用者[' + userId + ']股票[' + companyId + ']數量[' + amount + ']但數量不足！');
    }
  }
  else {
    throw new Meteor.Error(500, '試圖扣除不存在的使用者[' + userId + ']股票[' + companyId + ']數量[' + amount + ']！');
  }
}
