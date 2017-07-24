'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { tx } from 'meteor/babrahams:transactions';
import { dbCompanies } from '../db/dbCompanies';
import { dbOrders } from '../db/dbOrders';
import { dbLog } from '../db/dbLog';
import { dbDirectors } from '../db/dbDirectors';
import { config } from '../config';

Meteor.methods({
  createBuyOrder(orderData) {
    check(this.userId, String);
    createBuyOrder(Meteor.user(), orderData);

    return true;
  }
});

export function createBuyOrder(user, orderData) {
  if (orderData.unitPrice < 1) {
    throw new Meteor.Error(403, '購買單價不可小於1！');
  }
  const totalCost = orderData.unitPrice * orderData.amount;
  if (user.profile.money < totalCost) {
    throw new Meteor.Error(403, '剩餘金錢不足，訂單無法成立！');
  }
  const companyName = orderData.companyName;
  if (! dbCompanies.findOne({companyName})) {
    throw new Meteor.Error(404, '不存在的公司股票，訂單無法成立！');
  }
  const username = user.username;
  orderData.username = username;
  orderData.orderType = '購入';
  orderData.createdAt = new Date();
  tx.start('購買下單');
  dbLog.insert({
    logType: '購買下單',
    username: [username],
    companyName: companyName,
    price: orderData.price,
    amount: orderData.amount
  }, {
    tx: true
  });
  Meteor.users.update({
    _id: user._id
  }, {
    $inc: {
      'profile.money': totalCost * -1
    }
  }, {
    tx: true
  });
  dbOrders.insert(orderData, {
    tx: true
  });
  tx.commit();
}

Meteor.methods({
  createSellOrder(orderData) {
    check(this.userId, String);
    createSellOrder(Meteor.user(), orderData);

    return true;
  }
});

export function createSellOrder(user, orderData) {
  const companyName = orderData.companyName;
  const companyData = dbCompanies.findOne({companyName})
  if (! companyData) {
    throw new Meteor.Error(404, '不存在的公司股票，訂單無法成立！');
  }
  const username = user.username;
  const directorData = dbDirectors.findOne({companyName, username});
  if (! directorData || directorData.stocks < orderData.amount) {
    throw new Meteor.Error(403, '擁有的股票數量不足，訂單無法成立！');
  }
  if (orderData.unitPrice > (companyData.lastPrice || 1)) {
    throw new Meteor.Error(403, '最低售出價格不可高於該股票的最後售出價格！');
  }
  orderData.username = username;
  orderData.orderType = '賣出';
  orderData.createdAt = new Date();
  tx.start('販賣下單');
  dbLog.insert({
    logType: '販賣下單',
    username: [username],
    companyName: companyName,
    price: orderData.price,
    amount: orderData.amount
  }, {
    tx: true
  });
  if (directorData.stocks === orderData.amount) {
    dbDirectors.remove({companyName, username}, {
      tx: true
    });
  }
  else {
    dbDirectors.update({companyName, username}, {
      $inc: {
        stocks: orderData.amount * -1
      }
    }, {
      tx: true
    });
  }
  dbOrders.insert(orderData, {
    tx: true
  });
  tx.commit();
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
  let increaseMoney = -1;
  if (orderData.orderType === '購入') {
    increaseMoney += (orderData.unitPrice * (orderData.amount - orderData.done));
  }
  tx.start('取消下單');
  dbLog.insert({
    logType: '取消下單',
    username: [username],
    companyName: orderData.companyName,
    price: orderData.price,
    amount: (orderData.amount - orderData.done),
    message: orderData.orderType
  }, {
    tx: true
  });
  Meteor.users.update({_id: user._id}, {
    $inc: {
      'profile.money': increaseMoney
    }
  }, {
    tx: true
  });
  if (orderData.orderType === '賣出') {
    const existDirectorData = dbDirectors.findOne({
      companyName: orderData.companyName,
      username: orderData.username
    });
    if (existDirectorData) {
      dbDirectors.update({
        _id: existDirectorData._id
      }, {
        $inc: {
          stocks: (orderData.amount - orderData.done)
        }
      }, {
        tx: true
      });
    }
    else {
      dbDirectors.insert({
        companyName: orderData.companyName,
        username: orderData.username,
        stocks: (orderData.amount - orderData.done)
      }, {
        tx: true
      });
    }
  }
  dbOrders.remove({
    _id: orderData._id
  }, {
    tx: true
  });
  tx.commit();
}

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
  tx.start('交易紀錄');
  _.each(sellOrderGroupByCompanyHash, (sellOrderList, companyName) => {
    const companyData = dbCompanies.findOne({name: companyName});
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
          const tradeNumber = Math.min(sellOrderData.amount - sellOrderData.done, buyOrderData.amount - sellOrderData.done);
          sellOrderData.done += tradeNumber;
          buyOrderData.done += tradeNumber;
          dbLog.insert({
            logType: '交易紀錄',
            username: [buyOrderData.username, sellOrderData.username],
            companyName: sellOrderData.companyName,
            price: buyOrderData.unitPrice,
            amount: tradeNumber
          }, {
            tx: true
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
            }, {
              tx: true
            });
          }
          else {
            dbDirectors.insert({
              companyName: companyName,
              username: buyOrderData.username,
              stocks: tradeNumber
            }, {
              tx: true
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
            tx: true
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
              message: buyOrderData.orderType
            }, {
              tx: true
            });
            dbOrders.remove({
              _id: buyOrderData._id
            }, {
              tx: true
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
            message: sellOrderData.orderType
          }, {
            tx: true
          });
          dbOrders.remove({
            _id: sellOrderData._id
          }, {
            tx: true
          });
        }
        //若沒有買單可以滿足賣單，且此賣單期望單價在(lastPrice || 1)以上，則取消之
        else if (sellOrderData.unitPrice > (lastPrice || 1)) {
          dbLog.insert({
            logType: '賣單取消',
            username: [sellOrderData.username],
            companyName: sellOrderData.companyName,
            price: sellOrderData.unitPrice,
            amount: sellOrderData.amount
          }, {
            tx: true
          });
          dbOrders.remove({
            _id: sellOrderData._id
          }, {
            tx: true
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
      }, {
        tx: true
      });
    }
  });
  tx.commit();
}

let releaseStocksCounter = generateRandomCounter();
export function releaseStocks() {
  releaseStocksCounter -= 1;
  if (releaseStocksCounter === 0) {
    tx.start('公司釋股');
    dbCompanies.find({
      lastPrice: {
        $gt: 1
      }
    }, {
      disableOplog: true
    }).forEach((companyData) => {
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
          companyName: companyData.name,
          amount: releaseStocksAmount
        }, {
          tx: true
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
            companyName: companyData.name,
            price: buyOrderData.unitPrice,
            amount: tradeNumber
          }, {
            tx: true
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
            }, {
              tx: true
            });
          }
          else {
            dbDirectors.insert({
              companyName: companyData.name,
              username: buyOrderData.username,
              stocks: tradeNumber
            }, {
              tx: true
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
              message: buyOrderData.orderType
            }, {
              tx: true
            });
            dbOrders.remove({
              _id: buyOrderData._id
            }, {
              tx: true
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
            }, {
              tx: true
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
        }, {
          tx: true
        });
      }
    });
    tx.commit();
    releaseStocksCounter = generateRandomCounter();
  }
}
function generateRandomCounter() {
  return 60 + Math.round(Math.random() * 300);
}
