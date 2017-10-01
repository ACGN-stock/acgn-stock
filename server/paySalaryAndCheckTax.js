'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { MongoInternals } from 'meteor/mongo';
import { config } from '../config';
import { resourceManager } from './resourceManager';
import { dbDirectors } from '../db/dbDirectors';
import { dbLog } from '../db/dbLog';
import { dbOrders } from '../db/dbOrders';
import { dbTaxes } from '../db/dbTaxes';
import { dbVariables } from '../db/dbVariables';
import { debug } from './debug';

const {salaryPerPay} = config;
export function paySalaryAndCheckTax() {
  debug.log('paySalary');
  const todayBeginTime = new Date().setHours(0, 0, 0, 0);
  const lastPayTime = dbVariables.get('lastPayTime');
  if (! lastPayTime || lastPayTime.setHours(0, 0, 0, 0) !== todayBeginTime) {
    if (Date.now() - lastPayTime <= 86400000) {
      console.error('paySalaryAndCheckTax error!', Date.now(), todayBeginTime, lastPayTime, lastPayTime.setHours(0, 0, 0, 0));

      return false;
    }
    const thisPayTime = new Date();
    dbVariables.set('lastPayTime', thisPayTime);
    resourceManager.request('paySalaryAndCheckTax', ['season'], (release) => {
      paySalary(thisPayTime);
      checkTax(todayBeginTime);
      release();
    });
  }
}

function paySalary(thisPayTime) {
  console.info(thisPayTime.toLocaleString() + ': paySalary');
  Meteor.users.update(
    {
      createdAt: {
        $lte: thisPayTime
      }
    },
    {
      $inc: {
        'profile.money': salaryPerPay
      }
    },
    {
      multi: true
    }
  );
  dbLog.insert({
    logType: '發薪紀錄',
    userId: ['!all'],
    price: salaryPerPay,
    createdAt: thisPayTime
  });
}

const ObjectID = MongoInternals.NpmModule.ObjectID;
function checkTax(todayBeginTime) {
  const expireTaxesCursor = dbTaxes.find({
    expireDate: {
      $lte: new Date(todayBeginTime)
    }
  });
  console.log('expire taxes data: ', expireTaxesCursor.count());
  if (expireTaxesCursor.count() > 0) {
    const directorsBulk = dbDirectors.rawCollection().initializeUnorderedBulkOp();
    let needExecuteDirectorBulk = false;
    const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
    const taxesBulk = dbTaxes.rawCollection().initializeUnorderedBulkOp();
    //逾期繳稅狀態可能在過程裡變來變去，因此需要有序的Bulk op
    const usersBulk = Meteor.users.rawCollection().initializeOrderedBulkOp();
    //紀錄各公司徵收到的股票
    const imposedStocksHash = {};
    expireTaxesCursor.forEach((taxData) => {
      const taxId = ObjectID(taxData._id._str);
      const userId = taxData.userId;
      const overdueDay = Math.ceil((todayBeginTime - taxData.expireDate.getTime()) / 86400000);
      //將使用者設為繳稅逾期狀態
      usersBulk
        .find({
          _id: userId
        })
        .updateOne({
          $set: {
            'profile.notPayTax': true
          }
        });
      const createdAtBasicTime = Date.now();
      //增加稅單罰金
      if (overdueDay <= 7) {
        const amount = Math.ceil((taxData.tax + taxData.zombie - taxData.paid) * 0.1);
        taxesBulk
          .find({
            _id: taxId
          })
          .updateOne({
            $inc: {
              fine: amount
            }
          });
        logBulk.insert({
          logType: '繳稅逾期',
          userId: [userId],
          amount: amount,
          createdAt: new Date(createdAtBasicTime)
        });
      }
      //開始強制徵收
      else {
        const needPay = taxData.tax + taxData.zombie - taxData.paid + taxData.fine;
        let imposedMoney = 0;
        //先徵收使用者的現金
        const userData = Meteor.users.findOne(userId, {
          fields: {
            'profile.money': 1
          }
        });
        if (userData.profile.money > 0) {
          Meteor.users.update(userId, {
            $inc: {
              'profile.money': needPay * -1
            }
          });
          imposedMoney += Math.min(userData.profile.money, needPay);
        }
        //撤銷所有買入訂單
        const buyOrderCursor = dbOrders.find({
          userId: userId,
          orderType: '購入'
        });
        if (imposedMoney < needPay && buyOrderCursor.count() > 0) {
          logBulk.insert({
            logType: '繳稅撤單',
            userId: [userId],
            createdAt: new Date(createdAtBasicTime)
          });
          buyOrderCursor.forEach((orderData) => {
            imposedMoney += orderData.unitPrice * (orderData.amount - orderData.done);
          });
          dbOrders.remove({
            userId: userId,
            orderType: '購入'
          });
        }
        //依參考價格依序沒收持有股票
        if (imposedMoney < needPay && dbDirectors.find({userId}).count() > 0) {
          const ownStockList = dbDirectors.aggregate([
            {
              $match: {
                userId: userId
              }
            },
            {
              $lookup: {
                from: 'companies',
                localField: 'companyId',
                foreignField: '_id',
                as: 'companyData'
              }
            },
            {
              $project: {
                _id: 1,
                stocks: 1,
                companyId: 1,
                listPrice: {
                  $arrayElemAt: ['$companyData.listPrice', 0]
                },
                isSeal: {
                  $arrayElemAt: ['$companyData.isSeal', 0]
                }
              }
            },
            {
              $match: {
                isSeal: false
              }
            },
            {
              $sort: {
                listPrice: -1
              }
            }
          ]);
          if (ownStockList.length > 0) {
            needExecuteDirectorBulk = true;
          }
          _.every(ownStockList, (stockData, index) => {
            if (! imposedStocksHash[stockData.companyId]) {
              imposedStocksHash[stockData.companyId] = 0;
            }
            //需要徵收多少股票才足以支付餘下稅金
            const imposedStocks = Math.ceil((needPay - imposedMoney) / stockData.listPrice);
            //全部徵收
            if (imposedStocks > stockData.stocks) {
              logBulk.insert({
                logType: '繳稅沒收',
                userId: [userId],
                companyId: stockData.companyId,
                price: stockData.listPrice,
                amount: stockData.stocks,
                createdAt: new Date(createdAtBasicTime + index + 1)
              });
              //因為aggregate取出的_id是真正的Mongo ObjectID，此處不需經過MongoInternals.NpmModule.ObjectID也可以丟進Bulk執行
              directorsBulk
                .find({
                  _id: stockData._id
                })
                .removeOne();
              imposedMoney += stockData.stocks * stockData.listPrice;
              imposedStocksHash[stockData.companyId] += stockData.stocks;
            }
            //部份徵收
            else {
              logBulk.insert({
                logType: '繳稅沒收',
                userId: [userId],
                companyId: stockData.companyId,
                price: stockData.listPrice,
                amount: imposedStocks,
                createdAt: new Date(createdAtBasicTime + index + 1)
              });
              //因為aggregate取出的_id是真正的Mongo ObjectID，此處不需經過MongoInternals.NpmModule.ObjectID也可以丟進Bulk執行
              directorsBulk
                .find({
                  _id: stockData._id
                })
                .updateOne({
                  $inc: {
                    stocks: imposedStocks * -1
                  }
                });
              imposedMoney += imposedStocks * stockData.listPrice;
              imposedStocksHash[stockData.companyId] += imposedStocks;
            }

            return imposedMoney < needPay;
          });
        }
        //若最後徵收的稅金不恰好等於需繳納的稅金，調整剩餘金錢
        if (imposedMoney !== needPay) {
          usersBulk
            .find({
              _id: userId
            })
            .updateOne({
              $inc: {
                'profile.money': (needPay - imposedMoney) * -1
              }
            });
        }
        //移除稅單並將使用者的繳稅逾期狀態取消
        //(如果使用者有多於一張的逾期稅單未繳，那檢查到下一張逾期稅單時狀態又會再設回來)
        taxesBulk
          .find({
            _id: taxId
          })
          .removeOne();
        usersBulk
          .find({
            _id: userId
          })
          .updateOne({
            $set: {
              'profile.notPayTax': false
            }
          });
      }
    });
    if (needExecuteDirectorBulk) {
      const createdAt = new Date();
      _.each(imposedStocksHash, (stocks, companyId) => {
        if (dbDirectors.find({companyId, userId: '!FSC'}).count() > 0) {
          directorsBulk
            .find({
              companyId: companyId,
              userId: '!FSC'
            })
            .updateOne({
              $inc: {
                stocks: stocks
              }
            });
        }
        else {
          directorsBulk.insert({
            companyId: companyId,
            userId: '!FSC',
            stocks: stocks,
            createdAt: createdAt,
            message: ''
          });
        }
      });
      directorsBulk.execute = Meteor.wrapAsync(directorsBulk.execute);
      directorsBulk.execute();
    }
    logBulk.execute = Meteor.wrapAsync(logBulk.execute);
    logBulk.execute();
    taxesBulk.execute = Meteor.wrapAsync(taxesBulk.execute);
    taxesBulk.execute();
    usersBulk.execute = Meteor.wrapAsync(usersBulk.execute);
    usersBulk.execute();
  }
}
