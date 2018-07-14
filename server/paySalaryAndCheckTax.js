import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { MongoInternals } from 'meteor/mongo';
import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbCompanies, gradeFactorTable } from '/db/dbCompanies';
import { dbDirectors } from '/db/dbDirectors';
import { dbEmployees } from '/db/dbEmployees';
import { dbLog } from '/db/dbLog';
import { dbOrders } from '/db/dbOrders';
import { dbTaxes } from '/db/dbTaxes';
import { dbVariables } from '/db/dbVariables';
import { debug } from '/server/imports/utils/debug';
import { backupMongo } from '/server/imports/utils/backupMongo';

const { salaryPerPay } = Meteor.settings.public;
export function paySalaryAndCheckTax() {
  debug.log('paySalary');
  const todayBeginTime = new Date().setHours(0, 0, 0, 0);
  const thisPayTime = new Date();
  dbVariables.set('lastPayTime', thisPayTime);
  resourceManager.request('paySalaryAndCheckTax', ['season'], (release) => {
    backupMongo('-salaryBefore');
    paySystemSalary(thisPayTime);
    paySalaryAndGenerateProfit(thisPayTime);
    checkTax(todayBeginTime);
    release();
  });
}

function paySystemSalary(thisPayTime) {
  console.info(thisPayTime.toLocaleString() + ': paySystemSalary');
  Meteor.users.update({
    createdAt: { $lte: thisPayTime }
  }, {
    $inc: { 'profile.money': salaryPerPay }
  }, {
    multi: true
  });

  dbLog.insert({
    logType: '發薪紀錄',
    userId: ['!all'],
    data: { salary: salaryPerPay },
    createdAt: thisPayTime
  });
}

function paySalaryAndGenerateProfit(thisPayTime) {
  console.info(thisPayTime.toLocaleString() + ': paySalaryAndGenerateProfit');

  const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
  const usersBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();
  const companyBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();

  let needExecuteBulk = false;
  dbCompanies.find().forEach((company) => {
    const employees = dbEmployees.find({
      companyId: company._id,
      employed: true
    }).map((employee) => {
      return employee.userId;
    });

    if (employees.length <= 0) {
      return;
    }

    needExecuteBulk = true;
    usersBulk.find({
      _id: {
        $in: employees
      }
    }).update({
      $inc: {
        'profile.money': company.salary - salaryPerPay
      }
    });
    logBulk.insert({
      logType: '發薪紀錄',
      userId: employees,
      companyId: company._id,
      data: { salary: company.salary },
      createdAt: thisPayTime
    });

    // 根據公司評級計算當日總營利額
    const gradeFactor = gradeFactorTable.dailyProfit[company.grade] || 0;

    // 基礎營利額
    const baseProfit = 3000 * (0.9 + gradeFactor) * employees.length;

    // 爆肝營利額
    const explosionProb = Math.min(0.3, 0.01 * employees.length);
    const explosionCount = employees.reduce((count) => {
      return (Math.random() < explosionProb) ? count + 1 : count;
    }, 0);
    const explosiveProfit = 3000 * (0.9 + gradeFactor) * gradeFactor * explosionCount;

    const totalProfit = Math.round(baseProfit + explosiveProfit);
    const totalSalary = company.salary * employees.length;
    companyBulk.find({
      _id: company._id
    }).updateOne({
      $inc: {
        profit: totalProfit - totalSalary
      }
    });
    logBulk.insert({
      logType: '員工營利',
      userId: employees,
      companyId: company._id,
      data: { profit: totalProfit },
      createdAt: thisPayTime
    });
  });

  if (needExecuteBulk) {
    logBulk.execute = Meteor.wrapAsync(logBulk.execute);
    logBulk.execute();
    usersBulk.execute = Meteor.wrapAsync(usersBulk.execute);
    usersBulk.execute();
    companyBulk.execute = Meteor.wrapAsync(companyBulk.execute);
    companyBulk.execute();
  }
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
    // 逾期繳稅狀態可能在過程裡變來變去，因此需要有序的Bulk op
    const usersBulk = Meteor.users.rawCollection().initializeOrderedBulkOp();
    // 紀錄各公司徵收到的股票
    const imposedStocksHash = {};
    expireTaxesCursor.forEach((taxData) => {
      const taxId = new ObjectID(taxData._id._str);
      const userId = taxData.userId;
      const overdueDay = Math.ceil((todayBeginTime - taxData.expireDate.getTime()) / 86400000);
      // 將使用者設為繳稅逾期狀態
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
      // 增加稅單罰金
      if (overdueDay < 7) {
        const amount = Math.ceil((taxData.stockTax + taxData.moneyTax) * 0.1);
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
          data: { fine: amount },
          createdAt: new Date(createdAtBasicTime)
        });
      }
      // 開始強制徵收
      else {
        const needPay = taxData.stockTax + taxData.moneyTax + taxData.zombieTax + taxData.fine - taxData.paid;
        let imposedMoney = 0;
        // 先徵收使用者的現金
        const userData = Meteor.users.findOne(userId, {
          fields: {
            'profile.money': 1
          }
        });
        if (userData.profile.money > 0) {
          const directPayMoney = Math.min(userData.profile.money, needPay);
          usersBulk
            .find({
              _id: userId
            })
            .updateOne({
              $inc: {
                'profile.money': directPayMoney * -1
              }
            });
          logBulk.insert({
            logType: '繳稅沒金',
            userId: [userId],
            data: { money: directPayMoney },
            createdAt: new Date(createdAtBasicTime + 1)
          });
          imposedMoney += directPayMoney;
        }
        // 撤銷所有買入訂單
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
        // 依參考價格依序沒收持有股票
        if (imposedMoney < needPay && dbDirectors.find({ userId }).count() > 0) {
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
            // 需要徵收多少股票才足以支付餘下稅金
            const imposedStocks = Math.ceil((needPay - imposedMoney) / stockData.listPrice);
            // 全部徵收
            if (imposedStocks >= stockData.stocks) {
              logBulk.insert({
                logType: '繳稅沒收',
                userId: [userId],
                companyId: stockData.companyId,
                data: {
                  price: stockData.listPrice,
                  stocks: stockData.stocks
                },
                createdAt: new Date(createdAtBasicTime + index + 2)
              });
              // 因為aggregate取出的_id是真正的Mongo ObjectID，此處不需經過MongoInternals.NpmModule.ObjectID也可以丟進Bulk執行
              directorsBulk
                .find({
                  _id: stockData._id
                })
                .removeOne();
              imposedMoney += stockData.stocks * stockData.listPrice;
              imposedStocksHash[stockData.companyId] += stockData.stocks;
            }
            // 部份徵收
            else {
              logBulk.insert({
                logType: '繳稅沒收',
                userId: [userId],
                companyId: stockData.companyId,
                data: {
                  price: stockData.listPrice,
                  stocks: imposedStocks
                },
                createdAt: new Date(createdAtBasicTime + index + 2)
              });
              // 因為aggregate取出的_id是真正的Mongo ObjectID，此處不需經過MongoInternals.NpmModule.ObjectID也可以丟進Bulk執行
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
        // 若最後徵收的稅金不恰好等於需繳納的稅金，調整剩餘金錢
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
        // 移除稅單並將使用者的繳稅逾期狀態取消
        // (如果使用者有多於一張的逾期稅單未繳，那檢查到下一張逾期稅單時狀態又會再設回來)
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
        if (dbDirectors.find({ companyId, userId: '!FSC' }).count() > 0) {
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
