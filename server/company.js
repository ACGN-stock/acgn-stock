'use strict';
import { resourceManager } from './resourceManager';
import { changeStocksAmount, resolveOrder, updateCompanyLastPrice } from './methods/order';
import { dbCompanies } from '../db/dbCompanies';
import { dbOrders } from '../db/dbOrders';
import { dbLog } from '../db/dbLog';
import { dbVariables } from '../db/dbVariables';
import { config } from '../config';

export function releaseStocksForHighPrice() {
  let releaseStocksForHighPriceCounter = dbVariables.get('releaseStocksForHighPriceCounter') || 0;
  releaseStocksForHighPriceCounter -= 1;
  if (releaseStocksForHighPriceCounter <= 0) {
    releaseStocksForHighPriceCounter = generateReleaseStocksForHighPriceConter();
    console.info(new Date().toLocaleString() + ': releaseStocksForHighPrice');
    const maxPriceCompany = dbCompanies.findOne({}, {
      sort: {
        lastPrice: -1
      },
      fields: {
        lastPrice: 1
      }
    });
    if (! maxPriceCompany) {
      return false;
    }
    //釋股門檻價格
    const thresholdPrice = Math.round(maxPriceCompany.lastPrice / 2);
    dbCompanies
      .find(
        {
          lastPrice: {
            $gt: thresholdPrice
          }
        },
        {
          fields: {
            _id: 1,
            isSeal: 1
          },
          disableOplog: true
        }
      )
      .forEach((companyData) => {
        const companyId = companyData._id;
        const existsReleaseOrder = dbOrders.findOne({
          companyId: companyId,
          userId: '!system'
        });
        //有尚存在的釋股單在市場上時不繼續釋股
        if (existsReleaseOrder) {
          return false;
        }
        //被查封關停時不繼續釋股
        if (companyData.isSeal) {
          return false;
        }
        //先鎖定資源，再重新讀取一次資料進行運算
        resourceManager.request('releaseStocksForHighPrice', ['companyOrder' + companyId], (release) => {
          const companyData = dbCompanies.findOne(companyId, {
            fields: {
              _id: 1,
              manager: 1,
              lastPrice: 1,
              listPrice: 1,
              totalRelease: 1,
              profit: 1,
              totalValue: 1
            }
          });
          const maxReleaseStocks = Math.floor(companyData.totalRelease * 0.05);
          const releaseStocks = 1 + Math.floor(Math.random() * Math.min(companyData.lastPrice - thresholdPrice, maxReleaseStocks) / 2);
          dbLog.insert({
            logType: '公司釋股',
            companyId: companyId,
            amount: releaseStocks,
            price: companyData.listPrice,
            resolve: false,
            createdAt: new Date()
          });
          dbCompanies.update(companyId, {
            $inc: {
              totalRelease: releaseStocks
            }
          });
          let alreadyRelease = 0;
          let lastPrice = companyData.lastPrice;
          let anyTradeDone = false;
          dbOrders
            .find(
              {
                companyId: companyId,
                orderType: '購入',
                unitPrice: {
                  $gte: companyData.listPrice
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
              if (alreadyRelease >= releaseStocks) {
                return true;
              }
              const tradeNumber = Math.min(buyOrderData.amount - buyOrderData.done, releaseStocks - alreadyRelease);
              if (tradeNumber > 0) {
                anyTradeDone = true;
                alreadyRelease += tradeNumber;
                lastPrice = buyOrderData.unitPrice;
                dbLog.insert({
                  logType: '交易紀錄',
                  userId: [buyOrderData.userId],
                  companyId: companyId,
                  price: lastPrice,
                  amount: tradeNumber,
                  createdAt: new Date()
                });
                changeStocksAmount(buyOrderData.userId, companyId, tradeNumber);
                dbCompanies.update(companyId, {
                  $inc: {
                    profit: lastPrice * tradeNumber
                  }
                });
              }
              resolveOrder(buyOrderData, tradeNumber);
            });
          if (anyTradeDone) {
            updateCompanyLastPrice(companyData, lastPrice);
          }
          if (alreadyRelease < releaseStocks) {
            dbOrders.insert({
              companyId: companyId,
              userId: '!system',
              orderType: '賣出',
              unitPrice: companyData.listPrice,
              amount: releaseStocks,
              done: alreadyRelease,
              createdAt: new Date()
            });
          }
          release();
        });
      });
  }
  dbVariables.set('releaseStocksForHighPriceCounter', releaseStocksForHighPriceCounter);
}
function generateReleaseStocksForHighPriceConter() {
  const min = config.releaseStocksForHighPriceMinCounter;
  const max = (config.releaseStocksForHighPriceMaxCounter - min);

  return min + Math.floor(Math.random() * max);
}

export function releaseStocksForNoDeal() {
  let releaseStocksForNoDealCounter = dbVariables.get('releaseStocksForNoDealCounter') || 0;
  if (releaseStocksForNoDealCounter <= 0) {
    releaseStocksForNoDealCounter = generateReleaseStocksForNoDealConter();
    console.info(new Date().toLocaleString() + ': releaseStocksForNoDeal');
    const checkLogTime = new Date(Date.now() - (config.releaseStocksForNoDealMinCounter * config.intervalTimer));
    dbCompanies
      .find({}, {
        fields: {
          _id: 1,
          listPrice: 1,
          isSeal: 1
        },
        disableOplog: true
      })
      .forEach((companyData) => {
        //被查封關停時不繼續釋股
        if (companyData.isSeal) {
          return false;
        }
        const companyId = companyData._id;
        const dealData = dbLog.aggregate([
          {
            $match: {
              logType: '交易紀錄',
              companyId: companyId,
              createdAt: {
                $gte: checkLogTime
              }
            }
          },
          {
            $group: {
              _id: null,
              amount: {
                $sum: '$amount'
              }
            }
          }
        ])[0];
        const dealAmount = dealData ? dealData.amount : 0;
        const highPriceBuyData = dbOrders.aggregate([
          {
            $match: {
              orderType: '購入',
              companyId: companyId,
              unitPrice: Math.ceil(companyData.listPrice * 1.15)
            }
          },
          {
            $group: {
              _id: null,
              amount: {
                $sum: '$amount'
              },
              done: {
                $sum: '$done'
              }
            }
          },
          {
            $project: {
              amount: {
                $add: [
                  '$amount',
                  {
                    $multiply: ['$done', -1]
                  }
                ]
              }
            }
          }
        ])[0];
        const highPriceBuyAmount = highPriceBuyData ? highPriceBuyData.amount : 0;
        if (highPriceBuyAmount > (dealAmount * 10)) {
          console.info('releaseStocksForNoDeal triggered: ' + companyId);
          //先鎖定資源，再重新讀取一次資料進行運算
          resourceManager.request('releaseStocksForNoDeal', ['companyOrder' + companyId], (release) => {
            const companyData = dbCompanies.findOne(companyId, {
              fields: {
                lastPrice: 1,
                listPrice: 1,
                totalRelease: 1,
                profit: 1,
                totalValue: 1
              }
            });
            const releasePrice = Math.ceil(companyData.listPrice * 1.15);
            const highPriceBuyData = dbOrders.aggregate([
              {
                $match: {
                  orderType: '購入',
                  companyId: companyId,
                  unitPrice: releasePrice
                }
              },
              {
                $group: {
                  _id: null,
                  amount: {
                    $sum: '$amount'
                  },
                  done: {
                    $sum: '$done'
                  }
                }
              },
              {
                $project: {
                  amount: {
                    $add: [
                      '$amount',
                      {
                        $multiply: ['$done', -1]
                      }
                    ]
                  }
                }
              }
            ])[0];
            const highPriceBuyAmount = highPriceBuyData ? highPriceBuyData.amount : 0;
            if (highPriceBuyAmount > 0) {
              const releaseStocks = 1 + Math.floor(Math.random() * highPriceBuyAmount / 2);
              dbLog.insert({
                logType: '公司釋股',
                companyId: companyId,
                amount: releaseStocks,
                price: releasePrice,
                resolve: false,
                createdAt: new Date()
              });
              dbCompanies.update(companyId, {
                $inc: {
                  totalRelease: releaseStocks
                }
              });
              let alreadyRelease = 0;
              let anyTradeDone = false;
              dbOrders
                .find(
                  {
                    companyId: companyId,
                    orderType: '購入',
                    unitPrice: releasePrice
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
                  if (alreadyRelease >= releaseStocks) {
                    return true;
                  }
                  const tradeNumber = Math.min(buyOrderData.amount - buyOrderData.done, releaseStocks - alreadyRelease);
                  if (tradeNumber > 0) {
                    anyTradeDone = true;
                    alreadyRelease += tradeNumber;
                    dbLog.insert({
                      logType: '交易紀錄',
                      userId: [buyOrderData.userId],
                      companyId: companyId,
                      price: releasePrice,
                      amount: tradeNumber,
                      createdAt: new Date()
                    });
                    changeStocksAmount(buyOrderData.userId, companyId, tradeNumber);
                    dbCompanies.update(companyId, {
                      $inc: {
                        profit: releasePrice * tradeNumber
                      }
                    });
                  }
                  resolveOrder(buyOrderData, tradeNumber);
                });
              if (anyTradeDone) {
                updateCompanyLastPrice(companyData, releasePrice);
              }
            }
            release();
          });
        }
      });
  }
  dbVariables.set('releaseStocksForNoDealCounter', releaseStocksForNoDealCounter);
}
function generateReleaseStocksForNoDealConter() {
  const min = config.releaseStocksForNoDealMinCounter;
  const max = (config.releaseStocksForNoDealMaxCounter - min);

  return min + Math.floor(Math.random() * max);
}

export function recordListPrice() {
  let recordListPriceConter = dbVariables.get('recordListPriceConter') || 0;
  recordListPriceConter -= 1;
  if (recordListPriceConter <= 0) {
    recordListPriceConter = generateRecordListPriceConter();
    console.info(new Date().toLocaleString() + ': recordListPriceConter');
    dbCompanies
      .find(
        {},
        {
          fields: {
            _id: 1,
            lastPrice: 1,
            listPrice: 1,
            isSeal: 1
          },
          disableOplog: true
        }
      )
      .forEach((companyData) => {
        //被查封關停時不再紀錄
        if (companyData.isSeal) {
          return false;
        }
        if (companyData.lastPrice !== companyData.listPrice) {
          const companyId = companyData._id;
          //先鎖定資源，再重新讀取一次資料進行運算
          resourceManager.request('recordListPrice', ['companyOrder' + companyId], (release) => {
            const companyData = dbCompanies.findOne(companyId, {
              fields: {
                lastPrice: 1,
                totalRelease: 1
              }
            });
            dbCompanies.update(companyId, {
              $set: {
                listPrice: companyData.lastPrice,
                totalValue: companyData.lastPrice * companyData.totalRelease
              }
            });
            release();
          });
        }
      });
  }
  dbVariables.set('recordListPriceConter', recordListPriceConter);
}
function generateRecordListPriceConter() {
  const min = config.recordListPriceMinCounter;
  const max = (config.recordListPriceMaxCounter - min);

  return min + Math.floor(Math.random() * max);
}
