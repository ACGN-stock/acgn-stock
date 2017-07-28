'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { lockManager } from '../lockManager';
import { dbCompanies } from '../db/dbCompanies';
import { dbOrders } from '../db/dbOrders';
import { dbLog } from '../db/dbLog';
import { dbDirectors } from '../db/dbDirectors';
import { dbPrice } from '../db/dbPrice';
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
      let lastPrice = 0;
      const buyOrderList = buyOrderGroupByCompanyHash[companyName] || [];
      _.each(sellOrderList, (sellOrderData) => {
        _.every(buyOrderList, (buyOrderData) => {
          if (sellOrderData.done >= sellOrderData.amount) {
            return false;
          }
          if (buyOrderData.done >= buyOrderData.amount) {
            return true;
          }
          lastPrice = buyOrderData.unitPrice;
          if (buyOrderData.unitPrice < sellOrderData.unitPrice) {
            return false;
          }
          const tradeNumber = Math.min(sellOrderData.amount - sellOrderData.done, buyOrderData.amount - buyOrderData.done);
          sellOrderData.done += tradeNumber;
          buyOrderData.done += tradeNumber;
          dbLog.insert({
            logType: '交易紀錄',
            username: [buyOrderData.username, sellOrderData.username],
            companyName: sellOrderData.companyName,
            price: buyOrderData.unitPrice,
            amount: tradeNumber,
            createdAt: new Date()
          });
          const existDirectorData = dbDirectors.findOne({
            companyName: companyName,
            username: buyOrderData.username
          });
          if (existDirectorData) {
            dbDirectors.update({
              _id: existDirectorData._id
            }, {
              $inc: {
                stocks: tradeNumber
              }
            });
          }
          else {
            dbDirectors.insert({
              companyName: companyName,
              username: buyOrderData.username,
              stocks: tradeNumber
            });
          }
          dbOrders.update({
            $or: [
              {
                _id: sellOrderData._id
              },
              {
                _id: buyOrderData._id
              }
            ]
          }, {
            $inc: {
              done: tradeNumber
            }
          }, {
            multi: true
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

          return true;
        });
        if (sellOrderData.done === sellOrderData.amount) {
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
        //若沒有買單可以滿足賣單，且此賣單期望單價在(lastPrice || 1)以上，則取消之
        else if (sellOrderData.unitPrice > (lastPrice || 1)) {
          dbLog.insert({
            logType: '賣單撤銷',
            username: [sellOrderData.username],
            companyName: sellOrderData.companyName,
            price: sellOrderData.unitPrice,
            amount: sellOrderData.amount,
            createdAt: new Date()
          });
          dbOrders.remove({
            _id: sellOrderData._id
          });
        }
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
    unlock();
  });
}

let releaseStocksCounter = generateRandomCounter();
export function releaseStocks() {
  releaseStocksCounter -= 1;
  if (releaseStocksCounter === 0) {
    dbCompanies.find({
      lastPrice: {
        $gt: 1
      }
    }, {
      disableOplog: true
    }).forEach((companyData) => {
      const companyName = companyData.companyName;
      const unlock = lockManager.lock([companyName], true);
      const lastPrice = companyData.lastPrice;
      let releaseChance = 0;
      dbOrders.find({
        orderType: '購入',
        unitPrice: {
          $gt: lastPrice
        }
      }, {
        disableOplog: true
      }).forEach((orderData) => {
        releaseChance += (orderData.unitPrice - lastPrice) * orderData.amount;
      });

      if (Math.random() * releaseChance > config.releaseStocksChance) {
        let releaseStocksAmount = Math.round(Math.random() * releaseChance);
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
          dbLog.insert({
            logType: '交易紀錄',
            username: [buyOrderData.username],
            companyName: companyName,
            price: buyOrderData.unitPrice,
            amount: tradeNumber,
            createdAt: new Date()
          });
          const existDirectorData = dbDirectors.findOne({
            companyName: companyData.name,
            username: buyOrderData.username
          });
          if (existDirectorData) {
            dbDirectors.update({
              _id: existDirectorData._id
            }, {
              $inc: {
                stocks: tradeNumber
              }
            });
          }
          else {
            dbDirectors.insert({
              companyName: companyData.name,
              username: buyOrderData.username,
              stocks: tradeNumber
            });
          }

          //訂單完成
          if (buyOrderData.done === buyOrderData.amount) {
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
            dbOrders.update({
              $or: [
                {
                  _id: buyOrderData._id
                }
              ]
            }, {
              $inc: {
                done: tradeNumber
              }
            });
          }

          return true;
        });
        dbCompanies.update({
          _id: companyData._id
        }, {
          $set: {
            lastPrice: lastPrice,
            totalValue: lastPrice * (companyData.totalRelease + releaseStocksAmount)
          },
          $inc: {
            totalRelease: releaseStocksAmount
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
  return 60 + Math.round(Math.random() * 300);
}
