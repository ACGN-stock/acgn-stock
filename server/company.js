'use strict';
import { Meteor } from 'meteor/meteor';

import { createOrder } from './imports/createOrder';
import { resourceManager } from '/server/imports/resourceManager';
import { dbCompanies } from '/db/dbCompanies';
import { dbDirectors } from '/db/dbDirectors';
import { dbOrders } from '/db/dbOrders';
import { dbLog } from '/db/dbLog';
import { dbVariables } from '/db/dbVariables';
import { debug } from '/server/imports/debug';

const counterBase = 1000 * 60;

export function releaseStocksForHighPrice() {
  debug.log('releaseStocksForHighPrice');
  let releaseStocksForHighPriceCounter = dbVariables.get('releaseStocksForHighPriceCounter') || 0;
  releaseStocksForHighPriceCounter -= 1;
  if (releaseStocksForHighPriceCounter <= 0) {
    releaseStocksForHighPriceCounter = generateReleaseStocksForHighPriceConter();
    dbVariables.set('releaseStocksForHighPriceCounter', releaseStocksForHighPriceCounter);
    console.info('releaseStocksForHighPrice triggered! next counter: ', releaseStocksForHighPriceCounter);
    updateReleaseStocksForHighPricePeriod();

    const companiesNumber = dbCompanies.find({isSeal: false}).count();
    const highPriceCompaniesNumber = Math.floor(companiesNumber * 0.05);
    if (highPriceCompaniesNumber > 0) {
      dbCompanies
        .find(
          {
            isSeal: false
          },
          {
            sort: {
              lastPrice: -1
            },
            fields: {
              _id: 1
            },
            limit: highPriceCompaniesNumber,
            disableOplog: true
          }
        )
        .forEach((companyData) => {
          const companyId = companyData._id;
          const existsReleaseOrderCount = dbOrders
            .find({
              companyId: companyId,
              userId: '!system'
            })
            .count();
          //有尚存在的任何釋股單在市場上時不會繼續釋股
          if (existsReleaseOrderCount > 0) {
            return false;
          }
          //先鎖定資源，再重新讀取一次資料進行運算
          resourceManager.request('releaseStocksForHighPrice', ['companyOrder' + companyId], (release) => {
            const companyData = dbCompanies.findOne(companyId, {
              fields: {
                _id: 1,
                listPrice: 1,
                totalRelease: 1
              }
            });
            const maxReleaseStocks = Math.floor(Math.sqrt(companyData.totalRelease));
            const releaseStocks = 1 + Math.floor(Math.random() * maxReleaseStocks);
            createOrder({
              userId: '!system',
              companyId: companyId,
              orderType: '賣出',
              unitPrice: Math.ceil(companyData.listPrice * 1.15),
              amount: releaseStocks
            });
            release();
          });
        });
    }
  }
  else {
    dbVariables.set('releaseStocksForHighPriceCounter', releaseStocksForHighPriceCounter);
  }
}
function generateReleaseStocksForHighPriceConter() {
  const min = Meteor.settings.public.releaseStocksForHighPriceMinCounter;
  const max = (Meteor.settings.public.releaseStocksForHighPriceMaxCounter - min);

  return min + Math.floor(Math.random() * max);
}
function updateReleaseStocksForHighPricePeriod() {
  const now = Date.now();
  const begin = now + Meteor.settings.public.releaseStocksForHighPriceMinCounter * counterBase;
  const end = now + Meteor.settings.public.releaseStocksForHighPriceMaxCounter * counterBase;

  dbVariables.set('releaseStocksForHighPriceBegin', begin);
  dbVariables.set('releaseStocksForHighPriceEnd', end);
}

export function releaseStocksForNoDeal() {
  debug.log('releaseStocksForNoDeal');
  let releaseStocksForNoDealCounter = dbVariables.get('releaseStocksForNoDealCounter') || 0;
  releaseStocksForNoDealCounter -= 1;
  if (releaseStocksForNoDealCounter <= 0) {
    releaseStocksForNoDealCounter = generateReleaseStocksForNoDealConter();
    dbVariables.set('releaseStocksForNoDealCounter', releaseStocksForNoDealCounter);
    console.info('releaseStocksForNoDeal triggered! next counter: ', releaseStocksForNoDealCounter);
    updateReleaseStocksForNoDealPeriod();

    const checkLogTime = new Date(Date.now() - (Meteor.settings.public.releaseStocksForNoDealMinCounter * Meteor.settings.public.intervalTimer));
    const lowPriceThreshold = dbVariables.get('lowPriceThreshold');
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
                $gte: companyData.listPrice < lowPriceThreshold ? Math.ceil(companyData.listPrice * 1.3) : Math.ceil(companyData.listPrice * 1.15)
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
  const min = Meteor.settings.public.releaseStocksForNoDealMinCounter;
  const max = (Meteor.settings.public.releaseStocksForNoDealMaxCounter - min);

  return min + Math.floor(Math.random() * max);
}
function updateReleaseStocksForNoDealPeriod() {
  const now = Date.now();
  const begin = now + Meteor.settings.public.releaseStocksForNoDealMinCounter * counterBase;
  const end = now + Meteor.settings.public.releaseStocksForNoDealMaxCounter * counterBase;

  dbVariables.set('releaseStocksForNoDealBegin', begin);
  dbVariables.set('releaseStocksForNoDealEnd', end);
}

export function releaseStocksForLowPrice() {
  debug.log('releaseStocksForLowPrice');
  let releaseStocksForLowPriceCounter = dbVariables.get('releaseStocksForLowPriceCounter') || 0;
  releaseStocksForLowPriceCounter -= 1;
  if (releaseStocksForLowPriceCounter <= 0) {
    releaseStocksForLowPriceCounter = Meteor.settings.public.releaseStocksForLowPriceCounter;
    dbVariables.set('releaseStocksForLowPriceCounter', releaseStocksForLowPriceCounter);
    console.info('releaseStocksForLowPrice triggered! next counter: ', releaseStocksForLowPriceCounter);
    updateReleaseStocksForLowPricePeriod();

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
function updateReleaseStocksForLowPricePeriod() {
  const jitter = 30;
  const now = Date.now();
  const begin = now + (Meteor.settings.public.releaseStocksForLowPriceCounter - jitter) * counterBase;
  const end = now + (Meteor.settings.public.releaseStocksForLowPriceCounter + jitter) * counterBase;

  dbVariables.set('releaseStocksForLowPriceBegin', begin);
  dbVariables.set('releaseStocksForLowPriceEnd', end);
}

export function recordListPriceAndSellFSCStocks() {
  debug.log('recordListPrice');
  let recordListPriceConter = dbVariables.get('recordListPriceConter') || 0;
  recordListPriceConter -= 1;
  if (recordListPriceConter <= 0) {
    recordListPriceConter = generateRecordListPriceConter();
    dbVariables.set('recordListPriceConter', recordListPriceConter);
    console.info('recordListPrice triggered! next counter: ', recordListPriceConter);
    updateRecordListPricePeriod();

    dbCompanies
      .find(
        {
          isSeal: false
        },
        {
          fields: {
            _id: 1,
            lastPrice: 1,
            listPrice: 1
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
  const min = Meteor.settings.public.recordListPriceMinCounter;
  const max = (Meteor.settings.public.recordListPriceMaxCounter - min);

  return min + Math.floor(Math.random() * max);
}
function updateRecordListPricePeriod() {
  const now = Date.now();
  const begin = now + Meteor.settings.public.recordListPriceMinCounter * counterBase;
  const end = now + Meteor.settings.public.recordListPriceMaxCounter * counterBase;

  dbVariables.set('recordListPriceBegin', begin);
  dbVariables.set('recordListPriceEnd', end);
}

let checkChairmanCounter = Meteor.settings.public.checkChairmanCounter;
export function checkChairman() {
  debug.log('checkChairman');
  checkChairmanCounter -= 1;
  if (checkChairmanCounter <= 0) {
    const companiesBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
    let needExecuteBulk = false;
    checkChairmanCounter = Meteor.settings.public.checkChairmanCounter;
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
