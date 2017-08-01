'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { lockManager } from '../lockManager';
import { dbCompanies } from '../db/dbCompanies';
import { dbOrders } from '../db/dbOrders';
import { dbLog } from '../db/dbLog';
import { dbDirectors } from '../db/dbDirectors';
import { dbPrice } from '../db/dbPrice';
import { dbDebugger } from '../db/dbDebugger';
import { config } from '../config';

export function tradeStocks() {
  const allBuyOrders = dbOrders.find({
    orderType: '購入'
  }, {
    sort: {
      unitPrice: -1
    }
  }).fetch();
  const buyOrderGroupByCompanyHash = _.groupBy(allBuyOrders, 'companyName');
  const allSellOrders = dbOrders.find({
    orderType: '賣出'
  }, {
    disableOplog: true,
    sort: {
      unitPrice: 1
    }
  }).fetch();
  const sellOrderGroupByCompanyHash = _.groupBy(allSellOrders, 'companyName');
  _.each(sellOrderGroupByCompanyHash, (sellOrderList, companyName) => {
    const companyData = dbCompanies.findOne({companyName});
    const unlock = lockManager.lock([companyName], true);
    if (companyData) {
      dbDebugger.insert({
        time: new Date(),
        message: 'start resolve sell order of company [' + companyName + ']...'
      });
      let lastPrice = 0;
      const buyOrderList = buyOrderGroupByCompanyHash[companyName] || [];
      _.each(sellOrderList, (sellOrderData) => {
        dbDebugger.insert({
          time: new Date(),
          message: 'start look sell order:' + JSON.stringify(sellOrderData)
        });
        _.every(buyOrderList, (buyOrderData) => {
          dbDebugger.insert({
            time: new Date(),
            message: 'start look buy order:' + JSON.stringify(buyOrderData)
          });
          if (sellOrderData.done >= sellOrderData.amount) {
            return false;
          }
          if (buyOrderData.done >= buyOrderData.amount) {
            return true;
          }
          if (sellOrderData.username === buyOrderData.username) {
            return true;
          }
          if (buyOrderData.unitPrice < sellOrderData.unitPrice) {
            return false;
          }
          const tradeNumber = Math.min(sellOrderData.amount - sellOrderData.done, buyOrderData.amount - buyOrderData.done);
          sellOrderData.done += tradeNumber;
          buyOrderData.done += tradeNumber;
          lastPrice = buyOrderData.unitPrice;

          dbLog.insert({
            logType: '交易紀錄',
            username: [buyOrderData.username, sellOrderData.username],
            companyName: companyName,
            price: buyOrderData.unitPrice,
            amount: tradeNumber,
            createdAt: new Date()
          });
          dbDebugger.insert({
            time: new Date(),
            message: 'sell order [' + sellOrderData._id + '] and buy order id [' + buyOrderData._id + '] deal!, price is ' + buyOrderData.unitPrice + ', trade number is [' + tradeNumber + '].'
          });
          const existDirectorData = dbDirectors.findOne({
            companyName: companyName,
            username: buyOrderData.username
          });
          if (existDirectorData) {
            dbDebugger.insert({
              time: new Date(),
              message: 'buyer [' + buyOrderData.username + '] already has companyName[' + companyName + '] stocks[' + existDirectorData.stocks + '], increas [' + tradeNumber + '] instead.'
            });
            dbDirectors.update({
              _id: existDirectorData._id
            }, {
              $inc: {
                stocks: tradeNumber
              }
            });
          }
          else {
            dbDebugger.insert({
              time: new Date(),
              message: 'insert director data of buyer username[' + buyOrderData.username + '] companyName[' + companyName + '] stocks[' + tradeNumber + '].'
            });
            dbDirectors.insert({
              companyName: companyName,
              username: buyOrderData.username,
              stocks: tradeNumber
            });
          }

          dbDebugger.insert({
            time: new Date(),
            message: 'increase seller money of username[' + sellOrderData.username + '] money[' + (tradeNumber * buyOrderData.unitPrice) + '].'
          });
          Meteor.users.update({
            username: sellOrderData.username
          }, {
            $inc: {
              'profile.money': tradeNumber * buyOrderData.unitPrice
            }
          });

          //訂單完成
          if (buyOrderData.done === buyOrderData.amount) {
            dbDebugger.insert({
              time: new Date(),
              message: 'buy order [' + buyOrderData._id + '] is all done, delete it.'
            });
            dbLog.insert({
              logType: '訂單完成',
              username: [buyOrderData.username],
              companyName: buyOrderData.companyName,
              price: buyOrderData.unitPrice,
              amount: buyOrderData.amount,
              message: buyOrderData.orderType,
              createdAt: new Date()
            });
            dbOrders.remove({
              _id: buyOrderData._id
            });
          }
          else {
            dbDebugger.insert({
              time: new Date(),
              message: 'increase done number of buy order [' + buyOrderData._id + '] done[' + tradeNumber + '].'
            });
            dbOrders.update( buyOrderData._id, {
              $inc: {
                done: tradeNumber
              }
            });
          }

          return true;
        });
        if (sellOrderData.done === sellOrderData.amount) {
          dbDebugger.insert({
            time: new Date(),
            message: 'seller order [' + sellOrderData._id + '] is all done, delete it.'
          });
          dbLog.insert({
            logType: '訂單完成',
            username: [sellOrderData.username],
            companyName: sellOrderData.companyName,
            price: sellOrderData.unitPrice,
            amount: sellOrderData.amount,
            message: sellOrderData.orderType,
            createdAt: new Date()
          });
          dbOrders.remove({
            _id: sellOrderData._id
          });
        }
        else {
          dbDebugger.insert({
            time: new Date(),
            message: 'set done number of seller order [' + sellOrderData._id + '] done[' + sellOrderData.done + '].'
          });
          dbOrders.update(sellOrderData._id, {
            $set: {
              done: sellOrderData.done
            }
          });
        }
      });
      if (lastPrice > 0) {
        dbDebugger.insert({
          time: new Date(),
          message: 'set price of companyName[' + companyName + '] lastPrice[' + lastPrice + '] totalValue[' + (lastPrice * companyData.totalRelease) + '].'
        });
        dbCompanies.update({
          _id: companyData._id
        }, {
          $set: {
            lastPrice: lastPrice,
            totalValue: lastPrice * companyData.totalRelease
          }
        });
        dbPrice.insert({
          companyName: companyName,
          price: lastPrice,
          createdAt: new Date()
        });
      }
    }
    unlock();
  });
}

let releaseStocksCounter = generateRandomCounter();
export function releaseStocks() {
  releaseStocksCounter -= 1;
  if (releaseStocksCounter === 0) {
    dbCompanies.find({
      lastPrice: {
        $gt: config.releaseStocksThreshold
      }
    }, {
      disableOplog: true
    }).forEach((companyData) => {
      const companyName = companyData.companyName;
      const unlock = lockManager.lock([companyName], true);
      const lastPrice = companyData.lastPrice;
      let releaseChance = 0;
      let needAmount = 0;
      dbDebugger.insert({
        time: new Date(),
        message: 'look release chance of companyName[' + companyName + '], current price[' + lastPrice + ']...'
      });
      dbOrders.find({
        orderType: '購入',
        unitPrice: {
          $gt: lastPrice
        }
      }, {
        disableOplog: true
      }).forEach((orderData) => {
        needAmount += orderData.amount;
        releaseChance += (orderData.unitPrice - lastPrice) * orderData.amount;
        dbDebugger.insert({
          time: new Date(),
          message: 'have buy order data: ' + JSON.stringify(orderData)
        });
      });
      dbDebugger.insert({
        time: new Date(),
        message: 'final releaseChance[' + releaseChance + '] needAmount[' + needAmount + '].'
      });

      if (Math.random() * releaseChance > config.releaseStocksChance) {
        let releaseStocksAmount = Math.round(Math.random() * needAmount / 2);
        dbDebugger.insert({
          time: new Date(),
          message: 'final releaseAmount[' + releaseStocksAmount + '].'
        });
        dbLog.insert({
          logType: '公司釋股',
          companyName: companyName,
          amount: releaseStocksAmount,
          createdAt: new Date()
        });
        let lastPrice = companyData.lastPrice;
        dbOrders.find({
          orderType: '購入'
        }, {
          sort: {
            unitPrice: -1
          },
          disableOplog: true
        }).forEach((buyOrderData) => {
          if (releaseStocksAmount <= 0) {
            return true;
          }
          lastPrice = buyOrderData.unitPrice;
          const tradeNumber = Math.min(releaseStocksAmount, buyOrderData.amount - buyOrderData.done);
          buyOrderData.done += tradeNumber;
          releaseStocksAmount -= tradeNumber;
          dbDebugger.insert({
            time: new Date(),
            message: 'buy order id [' + buyOrderData._id + '] get release stock! price[' + lastPrice + '], tradeNumber[' + tradeNumber + '].'
          });
          dbLog.insert({
            logType: '交易紀錄',
            username: [buyOrderData.username],
            companyName: companyName,
            price: buyOrderData.unitPrice,
            amount: tradeNumber,
            createdAt: new Date()
          });
          const existDirectorData = dbDirectors.findOne({
            companyName: companyName,
            username: buyOrderData.username
          });
          if (existDirectorData) {
            dbDebugger.insert({
              time: new Date(),
              message: 'buyer [' + buyOrderData.username + '] already has companyName[' + companyName + '] stocks[' + existDirectorData.stocks + '], increas [' + tradeNumber + '] instead.'
            });
            dbDirectors.update({
              _id: existDirectorData._id
            }, {
              $inc: {
                stocks: tradeNumber
              }
            });
          }
          else {
            dbDebugger.insert({
              time: new Date(),
              message: 'insert director data of buyer username[' + buyOrderData.username + '] companyName[' + companyName + '] stocks[' + tradeNumber + '].'
            });
            dbDirectors.insert({
              companyName: companyName,
              username: buyOrderData.username,
              stocks: tradeNumber
            });
          }

          //訂單完成
          if (buyOrderData.done === buyOrderData.amount) {
            dbDebugger.insert({
              time: new Date(),
              message: 'buy order [' + buyOrderData._id + '] is all done, delete it.'
            });
            dbLog.insert({
              logType: '訂單完成',
              username: [buyOrderData.username],
              companyName: buyOrderData.companyName,
              price: buyOrderData.unitPrice,
              amount: buyOrderData.amount,
              message: buyOrderData.orderType,
              createdAt: new Date()
            });
            dbOrders.remove({
              _id: buyOrderData._id
            });
          }
          else {
            dbDebugger.insert({
              time: new Date(),
              message: 'increase done number of buy order [' + buyOrderData._id + '] done[' + tradeNumber + '].'
            });
            dbOrders.update(buyOrderData._id, {
              $inc: {
                done: tradeNumber
              }
            });
          }
        });
        dbDebugger.insert({
          time: new Date(),
          message: 'set price of companyName[' + companyName + '] lastPrice[' + lastPrice + '] totalValue[' + (lastPrice * companyData.totalRelease) + '] totalRelease[' + (companyData.totalRelease + releaseStocksAmount) + '].'
        });
        dbCompanies.update(companyData._id, {
          $set: {
            lastPrice: lastPrice,
            totalValue: lastPrice * (companyData.totalRelease + releaseStocksAmount),
            totalRelease: companyData.totalRelease + releaseStocksAmount
          }
        });
        dbPrice.insert({
          companyName: companyName,
          price: lastPrice,
          createdAt: new Date()
        });
      }
      unlock();
    });
    releaseStocksCounter = generateRandomCounter();
  }
}
function generateRandomCounter() {
  return 60 + Math.round(Math.random() * 10);
}
