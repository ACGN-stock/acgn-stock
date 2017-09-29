'use strict';
import { resourceManager } from './resourceManager';
import { dbCompanies } from '../db/dbCompanies';
import { dbDirectors } from '../db/dbDirectors';
import { dbOrders } from '../db/dbOrders';
import { dbLog } from '../db/dbLog';
import { dbVariables } from '../db/dbVariables';
import { config } from '../config';
import { createOrder } from './transaction';
import { debug } from './debug';

export function releaseStocksForHighPrice() {
  debug.log('releaseStocksForHighPrice');
  let releaseStocksForHighPriceCounter = dbVariables.get('releaseStocksForHighPriceCounter') || 0;
  releaseStocksForHighPriceCounter -= 1;
  if (releaseStocksForHighPriceCounter <= 0) {
    releaseStocksForHighPriceCounter = generateReleaseStocksForHighPriceConter();
    dbVariables.set('releaseStocksForHighPriceCounter', releaseStocksForHighPriceCounter);
    console.info('releaseStocksForHighPrice triggered! next counter: ', releaseStocksForHighPriceCounter);
    const maxPriceCompany = dbCompanies.findOne(
      {
        isSeal: false
      },
      {
        sort: {
          lastPrice: -1
        },
        fields: {
          lastPrice: 1
        }
      }
    );
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
          },
          isSeal: false
        },
        {
          fields: {
            _id: 1
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
          const maxReleaseStocks = Math.min((companyData.lastPrice - thresholdPrice) / 2, companyData.totalRelease * 0.05);
          const releaseStocks = 1 + Math.floor(Math.random() * maxReleaseStocks);
          createOrder({
            userId: '!system',
            companyId: companyId,
            orderType: '賣出',
            unitPrice: companyData.listPrice,
            amount: releaseStocks
          });
          release();
        });
      });
  }
  else {
    dbVariables.set('releaseStocksForHighPriceCounter', releaseStocksForHighPriceCounter);
  }
}
function generateReleaseStocksForHighPriceConter() {
  const min = config.releaseStocksForHighPriceMinCounter;
  const max = (config.releaseStocksForHighPriceMaxCounter - min);

  return min + Math.floor(Math.random() * max);
}

export function releaseStocksForNoDeal() {
  debug.log('releaseStocksForNoDeal');
  let releaseStocksForNoDealCounter = dbVariables.get('releaseStocksForNoDealCounter') || 0;
  releaseStocksForNoDealCounter -= 1;
  if (releaseStocksForNoDealCounter <= 0) {
    releaseStocksForNoDealCounter = generateReleaseStocksForNoDealConter();
    dbVariables.set('releaseStocksForNoDealCounter', releaseStocksForNoDealCounter);
    console.info('releaseStocksForNoDeal triggered! next counter: ', releaseStocksForNoDealCounter);
    const checkLogTime = new Date(Date.now() - (config.releaseStocksForNoDealMinCounter * config.intervalTimer));
    dbCompanies
      .find(
        {
          isSeal: false
        },
        {
          fields: {
            _id: 1,
            listPrice: 1
          },
          disableOplog: true
        }
      )
      .forEach((companyData) => {
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
              unitPrice: {
                $gte: Math.ceil(companyData.listPrice * 1.15)
              }
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
                  unitPrice:  {
                    $gte: releasePrice
                  }
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
              createOrder({
                userId: '!system',
                companyId: companyId,
                orderType: '賣出',
                unitPrice: releasePrice,
                amount: releaseStocks
              });
            }
            release();
          });
        }
      });
  }
  else {
    dbVariables.set('releaseStocksForNoDealCounter', releaseStocksForNoDealCounter);
  }
}
function generateReleaseStocksForNoDealConter() {
  const min = config.releaseStocksForNoDealMinCounter;
  const max = (config.releaseStocksForNoDealMaxCounter - min);

  return min + Math.floor(Math.random() * max);
}

export function releaseStocksForLowPrice() {
  debug.log('releaseStocksForLowPrice');
  let releaseStocksForLowPriceCounter = dbVariables.get('releaseStocksForLowPriceCounter') || 0;
  releaseStocksForLowPriceCounter -= 1;
  if (releaseStocksForLowPriceCounter <= 0) {
    releaseStocksForLowPriceCounter = config.releaseStocksForLowPriceCounter;
    dbVariables.set('releaseStocksForLowPriceCounter', releaseStocksForLowPriceCounter);
    console.info('releaseStocksForLowPrice triggered! next counter: ', releaseStocksForLowPriceCounter);
    const lowPriceThreshold = dbVariables.get('lowPriceThreshold');
    dbCompanies
      .find(
        {
          isSeal: false,
          listPrice: {
            $lt: lowPriceThreshold
          }
        },
        {
          fields: {
            _id: 1,
            listPrice: 1,
            totalRelease: 1
          },
          disableOplog: true
        }
      )
      .forEach((companyData) => {
        const companyId = companyData._id;
        const maxBuyPrice = Math.ceil(companyData.listPrice * 1.3);
        const highPriceBuyData = dbOrders.aggregate([
          {
            $match: {
              orderType: '購入',
              companyId: companyId,
              unitPrice: {
                $gte: maxBuyPrice
              }
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
        if (highPriceBuyAmount > Math.floor(companyData.totalRelease * 0.01)) {
          console.info('releaseStocksForLowPrice triggered: ' + companyId);
          //先鎖定資源，再重新讀取一次資料進行運算
          resourceManager.request('releaseStocksForLowPrice', ['companyOrder' + companyId], (release) => {
            const companyData = dbCompanies.findOne(companyId, {
              fields: {
                lastPrice: 1,
                listPrice: 1,
                totalRelease: 1,
                profit: 1,
                totalValue: 1
              }
            });
            const releasePrice = Math.ceil(companyData.listPrice * 1.3);
            const highPriceBuyData = dbOrders.aggregate([
              {
                $match: {
                  orderType: '購入',
                  companyId: companyId,
                  unitPrice: {
                    $gte: releasePrice
                  }
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
            const minReleaseAmount = Math.floor(companyData.totalRelease * 0.01);
            if (highPriceBuyAmount > minReleaseAmount) {
              const releaseStocks = Math.min(highPriceBuyAmount, Math.floor(companyData.totalRelease * 0.05));
              createOrder({
                userId: '!system',
                companyId: companyId,
                orderType: '賣出',
                unitPrice: releasePrice,
                amount: releaseStocks
              });
            }
            release();
          });
        }
      });
  }
  else {
    dbVariables.set('releaseStocksForLowPriceCounter', releaseStocksForLowPriceCounter);
  }
}

export function recordListPriceAndSellFSCStocks() {
  debug.log('recordListPrice');
  let recordListPriceConter = dbVariables.get('recordListPriceConter') || 0;
  recordListPriceConter -= 1;
  if (recordListPriceConter <= 0) {
    recordListPriceConter = generateRecordListPriceConter();
    dbVariables.set('recordListPriceConter', recordListPriceConter);
    console.info('recordListPrice triggered! next counter: ', recordListPriceConter);
    dbCompanies
      .find(
        {
          isSeal: false
        },
        {
          fields: {
            _id: 1,
            lastPrice: 1,
            listPrice: 1,
          },
          disableOplog: true
        }
      )
      .forEach((companyData) => {
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
    dbDirectors
      .find({
        userId: '!FSC'
      })
      .forEach((directoryData) => {
        const companyId = directoryData.companyId;
        resourceManager.request('sellFSCStocks', ['companyOrder' + companyId], (release) => {
          const companyData = dbCompanies.findOne(companyId, {
            fields: {
              _id: 1,
              listPrice: 1,
              isSeal: 1
            }
          });
          if (companyData && companyData.isSeal === false) {
            const amount = directoryData.stocks > 100 ? Math.ceil(directoryData.stocks * 0.1) : Math.min(directoryData.stocks, 10);
            createOrder({
              userId: '!FSC',
              companyId: companyId,
              orderType: '賣出',
              unitPrice: companyData.listPrice,
              amount: amount
            });
          }
          release();
        });
      });
  }
  else {
    dbVariables.set('recordListPriceConter', recordListPriceConter);
  }
}
function generateRecordListPriceConter() {
  const min = config.recordListPriceMinCounter;
  const max = (config.recordListPriceMaxCounter - min);

  return min + Math.floor(Math.random() * max);
}

let checkChairmanCounter = config.checkChairmanCounter;
export function checkChairman() {
  debug.log('checkChairman');
  checkChairmanCounter -= 1;
  if (checkChairmanCounter <= 0) {
    const companiesBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
    let needExecuteBulk = false;
    checkChairmanCounter = config.checkChairmanCounter;
    dbCompanies
      .find(
        {
          isSeal: false
        },
        {
          fields: {
            _id: 1,
            chairman: 1
          }
        }
      )
      .forEach((companyData) => {
        const companyId = companyData._id;
        const chairmanData = dbDirectors.findOne(
          {
            companyId: companyId,
            userId: {
              $ne: '!FSC'
            }
          },
          {
            sort: {
              stocks: -1,
              createdAt: 1
            },
            fields: {
              userId: 1
            }
          }
        );
        if (chairmanData.userId !== companyData.chairman) {
          needExecuteBulk = true;
          companiesBulk
            .find({
              _id: companyId
            })
            .updateOne({
              $set: {
                chairman: chairmanData.userId
              }
            });
        }
      });
    if (needExecuteBulk) {
      companiesBulk.execute();
    }
  }
}
