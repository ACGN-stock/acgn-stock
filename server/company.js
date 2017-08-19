'use strict';
import { resourceManager } from './resourceManager';
import { changeStocksAmount, resolveOrder, updateCompanyLastPrice } from './methods/order';
import { dbCompanies } from '../db/dbCompanies';
import { dbOrders } from '../db/dbOrders';
import { dbLog } from '../db/dbLog';
import { config } from '../config';

let releaseStocksForHighPriceCounter = generateReleaseStocksForHighPriceConter();
export function releaseStocksForHighPrice() {
  releaseStocksForHighPriceCounter -= 1;
  if (releaseStocksForHighPriceCounter <= 0) {
    releaseStocksForHighPriceCounter = generateReleaseStocksForHighPriceConter();
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
            companyName: 1,
            manager: 1,
            lastPrice: 1,
            listPrice: 1,
            totalRelease: 1,
            profit: 1,
            totalValue: 1
          },
          disableOplog: true
        }
      )
      .forEach((companyData) => {
        const companyName = companyData.companyName;
        const existsReleaseOrder = dbOrders.findOne({
          companyName: companyName,
          username: '!system'
        });
        //有尚存在的釋股單在市場上時不繼續釋股
        if (existsReleaseOrder) {
          return false;
        }
        //先鎖定資源，再重新讀取一次資料進行運算
        resourceManager.request('releaseStocksForHighPrice', ['companyOrder' + companyName], (release) => {
          const companyData = dbCompanies.findOne({companyName}, {
            fields: {
              _id: 1,
              companyName: 1,
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
            companyName: companyName,
            amount: releaseStocks,
            price: companyData.listPrice,
            resolve: false,
            createdAt: new Date()
          });
          dbCompanies.update(companyData._id, {
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
                companyName: companyName,
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
                  username: [buyOrderData.username],
                  companyName: companyName,
                  price: lastPrice,
                  amount: tradeNumber,
                  createdAt: new Date()
                });
                changeStocksAmount(buyOrderData.username, companyName, tradeNumber);
                dbCompanies.update({companyName}, {
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
              companyName: companyName,
              username: '!system',
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
}
function generateReleaseStocksForHighPriceConter() {
  const min = config.releaseStocksForHighPriceMinCounter;
  const max = (config.releaseStocksForHighPriceMaxCounter - min);

  return min + Math.floor(Math.random() * max);
}

let releaseStocksForNoDealCounter = generateReleaseStocksForNoDealConter();
export function releaseStocksForNoDeal() {
  releaseStocksForNoDealCounter -= 1;
  if (releaseStocksForNoDealCounter <= 0) {
    releaseStocksForNoDealCounter = generateReleaseStocksForNoDealConter();
    const checkLogTime = new Date(Date.now() - (config.releaseStocksForNoDealMinCounter * config.intervalTimer));
    dbCompanies
      .find({}, {
        fields: {
          _id: 1,
          companyName: 1,
          listPrice: 1
        },
        disableOplog: true
      })
      .forEach((companyData) => {
        const companyName = companyData.companyName;
        const dealData = dbLog.aggregate([
          {
            $match: {
              logType: '交易紀錄',
              companyName: companyName,
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
        const doublePriceBuyData = dbOrders.aggregate([
          {
            $match: {
              orderType: '購入',
              companyName: companyName,
              unitPrice: (companyData.listPrice * 2)
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
        const doublePriceBuyAmount = doublePriceBuyData ? doublePriceBuyData.amount : 0;
        if (doublePriceBuyAmount > (dealAmount * 10)) {
          //先鎖定資源，再重新讀取一次資料進行運算
          resourceManager.request('releaseStocksForNoDeal', ['companyOrder' + companyName], (release) => {
            const companyData = dbCompanies.findOne({companyName}, {
              fields: {
                _id: 1,
                companyName: 1,
                lastPrice: 1,
                listPrice: 1,
                totalRelease: 1,
                profit: 1,
                totalValue: 1
              }
            });
            const releasePrice = companyData.listPrice * 2;
            const doublePriceBuyData = dbOrders.aggregate([
              {
                $match: {
                  orderType: '購入',
                  companyName: companyName,
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
            const doublePriceBuyAmount = doublePriceBuyData ? doublePriceBuyData.amount : 0;
            if (doublePriceBuyAmount > 0) {
              const releaseStocks = 1 + Math.floor(Math.random() * doublePriceBuyAmount / 2);
              dbLog.insert({
                logType: '公司釋股',
                companyName: companyName,
                amount: releaseStocks,
                price: releasePrice,
                resolve: false,
                createdAt: new Date()
              });
              dbCompanies.update(companyData._id, {
                $inc: {
                  totalRelease: releaseStocks
                }
              });
              let alreadyRelease = 0;
              let anyTradeDone = false;
              dbOrders
                .find(
                  {
                    companyName: companyName,
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
                      username: [buyOrderData.username],
                      companyName: companyName,
                      price: releasePrice,
                      amount: tradeNumber,
                      createdAt: new Date()
                    });
                    changeStocksAmount(buyOrderData.username, companyName, tradeNumber);
                    dbCompanies.update({companyName}, {
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
}
function generateReleaseStocksForNoDealConter() {
  const min = config.releaseStocksForNoDealMinCounter;
  const max = (config.releaseStocksForNoDealMaxCounter - min);

  return min + Math.floor(Math.random() * max);
}

let recordListPriceConter = generateRecordListPriceConter();
export function recordListPrice() {
  recordListPriceConter -= 1;
  if (recordListPriceConter <= 0) {
    recordListPriceConter = generateRecordListPriceConter();
    dbCompanies
      .find(
        {},
        {
          fields: {
            _id: 1,
            companyName: 1,
            lastPrice: 1,
            listPrice: 1
          },
          disableOplog: true
        }
      )
      .forEach((companyData) => {
        if (companyData.lastPrice !== companyData.listPrice) {
          const companyName = companyData.companyName;
          //先鎖定資源，再重新讀取一次資料進行運算
          resourceManager.request('recordListPrice', ['companyOrder' + companyName], (release) => {
            const companyData = dbCompanies.findOne({companyName}, {
              fields: {
                _id: 1,
                lastPrice: 1,
                totalRelease: 1
              }
            });
            dbCompanies.update(companyData._id, {
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
}

function generateRecordListPriceConter() {
  const min = config.recordListPriceMinCounter;
  const max = (config.recordListPriceMaxCounter - min);

  return min + Math.floor(Math.random() * max);
}
