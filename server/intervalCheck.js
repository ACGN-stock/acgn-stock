'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { UserStatus } from 'meteor/mizzao:user-status';
import { resourceManager } from './resourceManager';
import { dbAdvertising } from '../db/dbAdvertising';
import { dbCompanies } from '../db/dbCompanies';
import { dbDirectors } from '../db/dbDirectors';
import { dbLog } from '../db/dbLog';
import { dbOrders } from '../db/dbOrders';
import { dbPrice } from '../db/dbPrice';
import { dbProducts } from '../db/dbProducts';
import { dbResourceLock } from '../db/dbResourceLock';
import { dbSeason } from '../db/dbSeason';
import { dbThreads } from '../db/dbThreads';
import { dbVoteRecord } from '../db/dbVoteRecord';
import { checkFoundCompany } from './foundation';
import { paySalaryAndCheckTax } from './paySalaryAndCheckTax';
import { setLowPriceThreshold } from './lowPriceThreshold';
import { recordListPriceAndSellFSCStocks, releaseStocksForHighPrice, releaseStocksForNoDeal, releaseStocksForLowPrice, checkChairman } from './company';
import { generateRankAndTaxesData } from './seasonRankAndTaxes';
import { threadId } from './thread';
import { debug } from './debug';
import { config } from '../config';

Meteor.startup(function() {
  Meteor.setInterval(intervalCheck, config.intervalTimer);
});

function intervalCheck() {
  //先移除所有一分鐘未更新的thread資料
  dbThreads.remove({
    refreshTime: {
      $lt: new Date(Date.now() - 60000)
    }
  });
  //如果現在沒有負責intervalWork的thread
  if (dbThreads.find({doIntervalWork: true}).count() < 1) {
    //將第一個thread指派為負責intervalWork工作
    dbThreads.update({}, {
      $set: {
        doIntervalWork: true
      }
    });
  }
  //取出負責intervalWork的thread資料
  const threadData = dbThreads.findOne({doIntervalWork: true});
  if (threadData._id === threadId) {
    doLoginObserver();
    doIntervalWork();
  }
  else {
    stopLoginObserver();
  }
}

//開始觀察以處理登入IP紀錄、未登入天數
let loginObserver;
function doLoginObserver() {
  if (! loginObserver) {
    console.log('start observer login info at ' + threadId + ' ' + Date.now());
    loginObserver = Meteor.users
      .find(
        {},
        {
          fields: {
            _id: 1,
            'status.lastLogin.date': 1,
            'status.lastLogin.ipAddr': 1
          },
          disableOplog: true
        }
      )
      .observe({
        changed: (newUserData, oldUserData) => {
          const previousLoginData = (oldUserData.status && oldUserData.status.lastLogin) || {
            date: new Date()
          };
          const nextLoginData = (newUserData.status && newUserData.status.lastLogin) || {
            date: new Date()
          };
          if (nextLoginData.ipAddr && nextLoginData.ipAddr !== previousLoginData.ipAddr) {
            dbLog.insert({
              logType: '登入紀錄',
              userId: [newUserData._id],
              message: nextLoginData.ipAddr,
              createdAt: new Date()
            });
          }
          const noLoginDay = Math.floor((nextLoginData.date.getTime() - previousLoginData.date.getTime()) / 86400000);
          if (noLoginDay > 0) {
            Meteor.users.update(newUserData._id, {
              $inc: {
                'profile.noLoginDayCount': Math.min(noLoginDay, 6)
              }
            });
          }
        }
      });
  }
}
//停止觀察處理登入IP紀錄、未登入天數
function stopLoginObserver() {
  if (loginObserver) {
    console.log('stop observer login info at ' + threadId + ' ' + Date.now());
    loginObserver.stop();
    loginObserver = null;
  }
}

//週期檢查工作內容
function doIntervalWork() {
  debug.log('doIntervalWork');
  const now = Date.now();
  const lastSeasonData = dbSeason.findOne({}, {
    sort: {
      beginDate: -1
    }
  });
  if (! lastSeasonData) {
    //產生新的商業季度
    generateNewSeason();    
  }
  else if (now >= lastSeasonData.electTime) {
    //若有正在競選經理人的公司，則計算出選舉結果。
    electManager(lastSeasonData);
  }
  else if (now >= lastSeasonData.endDate.getTime()) {
    //商業季度結束檢查
    doSeasonWorks(lastSeasonData);
  }
  else {
    //設定低價位股價門檻
    setLowPriceThreshold();
    //檢查所有創立中且投資時間截止的公司是否成功創立
    checkFoundCompany();
    //當發薪時間到時，發給所有驗證通過的使用者薪水，並檢查賦稅、增加滯納罰金與強制繳稅
    paySalaryAndCheckTax();
    //隨機時間讓符合條件的公司釋出股票
    releaseStocksForHighPrice();
    releaseStocksForNoDeal();
    releaseStocksForLowPrice();
    //隨機時間售出金管會股票並紀錄公司的參考價格
    recordListPriceAndSellFSCStocks();
    //檢查並更新各公司的董事長位置
    checkChairman();
  }
  //移除所有一分鐘以前的聊天發言紀錄
  dbLog.remove({
    logType: '聊天發言',
    createdAt: {
      $lt: new Date( Date.now() - 60000)
    }
  });
  //移除所有到期的廣告
  dbAdvertising.remove({
    createdAt: {
      $lt: new Date( Date.now() - config.advertisingExpireTime)
    }
  });
  //移除5分鐘以上的resource lock
  dbResourceLock
    .find({
      time: {
        $lt: new Date( Date.now() - 300000)
      }
    })
    .forEach((lockData) => {
      console.log(JSON.stringify(lockData) + ' locked time over 5 min...automatic release!');
      dbResourceLock.remove(lockData._id);
    });
  //移除所有debug紀錄
  debug.clean();
  //移除沒有IP地址的user connections
  UserStatus.connections.remove({
    ipAddr: {
      $exists: false
    }
  });
}

//商業季度結束檢查
function doSeasonWorks(lastSeasonData) {
  debug.log('doSeasonWorks', lastSeasonData);
  //避免執行時間過長導致重複進行季節結算
  if (dbResourceLock.findOne('season')) {
    return false;
  }
  console.info(new Date().toLocaleString() + ': doSeasonWorks');
  resourceManager.request('doSeasonWorks', ['season'], (release) => {
    //當商業季度結束時，取消所有尚未交易完畢的訂單
    cancelAllOrder();
    //當商業季度結束時，結算所有公司的營利額並按照股權分給股東。
    giveBonusByStocksFromProfit();
    //為所有公司與使用者進行排名結算
    generateRankAndTaxesData(lastSeasonData);
    //所有公司當季正營利額歸零
    dbCompanies.update(
      {
        profit: {
          $gt: 0
        }
      },
      {
        $set: {
          profit: 0
        }
      },
      {
        multi: true
      }
    );
    //產生新的商業季度
    generateNewSeason();
    //移除所有七天前的股價紀錄
    dbPrice.remove({
      createdAt: {
        $lt: new Date( Date.now() - 604800000 )
      }
    });
    //移除所有推薦票投票紀錄
    dbVoteRecord.remove({});
    //本季度未登入天數歸0
    Meteor.users.update(
      {},
      {
        $set: {
          'profile.noLoginDayCount': 0
        }
      },
      {
        multi: true
      }
    );
    release();
  });
}

//取消所有尚未交易完畢的訂單
function cancelAllOrder() {
  debug.log('cancelAllOrder');
  const now = new Date();
  const companiesBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
  const directorsBulk = dbDirectors.rawCollection().initializeUnorderedBulkOp();
  const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
  const usersBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();

  const userOrdersCursor = dbOrders.find({});
  if (userOrdersCursor.count() > 0) {
    //紀錄整個取消過程裡金錢有增加的userId及增加量
    const increaseMoneyHash = {};
    //紀錄整個取消過程裡股份有增加的userId及增加公司及增加量
    const increaseStocksHash = {};
    userOrdersCursor.forEach((orderData) => {
      const orderType = orderData.orderType;
      const userId = orderData.userId;
      const companyId = orderData.companyId;
      const leftAmount = orderData.amount - orderData.done;
      if (orderType === '購入') {
        if (increaseMoneyHash[userId] === undefined) {
          increaseMoneyHash[userId] = 0;
        }
        increaseMoneyHash[userId] += (orderData.unitPrice * leftAmount);
      }
      else {
        if (increaseStocksHash[userId] === undefined) {
          increaseStocksHash[userId] = {};
        }
        if (increaseStocksHash[userId][companyId] === undefined) {
          increaseStocksHash[userId][companyId] = 0;
        }
        increaseStocksHash[userId][companyId] += leftAmount;
      }
      logBulk.insert({
        logType: '系統撤單',
        userId: [userId],
        companyId: companyId,
        price: orderData.unitPrice,
        amount: leftAmount,
        message: orderType,
        createdAt: now
      });
    });
    _.each(increaseMoneyHash, (money, userId) => {
      usersBulk
        .find({
          _id: userId
        })
        .updateOne({
          $inc: {
            'profile.money': money
          }
        });
    });
    let index = 0;
    _.each(increaseStocksHash, (stocksHash, userId) => {
      //若撤銷的是系統賣單，則降低該公司的總釋股量
      if (userId === '!system') {
        _.each(stocksHash, (stocks, companyId) => {
          companiesBulk
            .find({
              _id: companyId
            })
            .updateOne({
              $inc: {
                totalRelease: stocks * -1
              }
            });
        });
      }
      else {
        const createdAt = new Date(now.getTime() + index);
        index += 1;
        _.each(stocksHash, (stocks, companyId) => {
          if (dbDirectors.find({companyId, userId}).count() > 0) {
            //由於directors主鍵為Mongo Object ID，在Bulk進行find會有問題，故以companyId+userId進行搜尋更新
            directorsBulk
              .find({companyId, userId})
              .updateOne({
                $inc: {
                  stocks: stocks
                }
              });
          }
          else {
            directorsBulk.insert({
              companyId: companyId,
              userId: userId,
              stocks: stocks,
              createdAt: createdAt
            });
          }
        });
      }
    });
    if (_.size(increaseMoneyHash) > 0) {
      usersBulk.execute = Meteor.wrapAsync(usersBulk.execute);
      usersBulk.execute();
    }
    if (_.size(increaseStocksHash) > 0) {
      if (_.size(increaseStocksHash['!system']) > 0) {
        companiesBulk.execute = Meteor.wrapAsync(companiesBulk.execute);
        companiesBulk.execute();
      }
      directorsBulk.execute = Meteor.wrapAsync(directorsBulk.execute);
      directorsBulk.execute();
    }
    logBulk.execute = Meteor.wrapAsync(logBulk.execute);
    logBulk.execute();
    dbOrders.remove({});
  }
}

//產生新的商業季度
function generateNewSeason() {
  debug.log('generateNewSeason');
  const beginDate = new Date();
  const endDate = new Date(beginDate.getTime() + config.seasonTime);
  const electTime = endDate.getTime() - 86400000;
  const userCount = Meteor.users.find().count();
  const productCount = dbProducts.find({overdue: 0}).count();
  //本季度每個使用者可以得到多少推薦票
  const vote = Math.max(Math.floor(productCount / 10), 1);
  const votePrice = Math.round(config.seasonProfitPerUser / vote);
  Meteor.users.update(
    {},
    {
      $set: {
        'profile.vote': vote
      }
    },
    {
      multi: true
    }
  );
  dbProducts.update(
    {
      overdue: 1
    },
    {
      $set: {
        overdue: 2
      }
    },
    {
      multi: true
    }
  );
  dbProducts.update(
    {
      overdue: 0
    },
    {
      $set: {
        overdue: 1
      }
    },
    {
      multi: true
    }
  );
  const seasonId = dbSeason.insert({beginDate, endDate, electTime, userCount, productCount, votePrice});

  return seasonId;
}

//當商業季度結束時，結算所有公司的營利額並按照股權分給股東。
function giveBonusByStocksFromProfit() {
  debug.log('giveBonusByStocksFromProfit');
  const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
  let needExecuteLogBulk = false;
  const usersBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();
  let needExecuteUserBulk = false;
  dbCompanies
    .find(
      {
        profit: {
          $gt: 0
        },
        isSeal: false
      },
      {
        fields: {
          _id: 1,
          manager: 1,
          totalRelease: 1,
          profit: 1
        },
        disableOplog: true
      }
    )
    .forEach((companyData) => {
      const now = Date.now();
      const companyId = companyData._id;
      let leftProfit = companyData.profit;
      logBulk.insert({
        logType: '公司營利',
        companyId: companyId,
        amount: leftProfit,
        createdAt: new Date(now)
      });
      needExecuteLogBulk = true;
      //經理人分紅
      if (companyData.manager !== '!none') {
        const managerProfit = Math.ceil(leftProfit * config.managerProfitPercent);
        logBulk.insert({
          logType: '營利分紅',
          userId: [companyData.manager],
          companyId: companyId,
          amount: managerProfit,
          createdAt: new Date(now + 1)
        });
        usersBulk
          .find({
            _id: companyData.manager
          })
          .updateOne({
            $inc: {
              'profile.money': managerProfit
            }
          });
        needExecuteUserBulk = true;
        leftProfit -= managerProfit;
      }
      //剩餘收益先扣去公司營運成本
      leftProfit -= Math.ceil(companyData.profit * config.costFromProfit);
      const forDirectorProfit = leftProfit;
      //取得所有能夠領取紅利的董事userId與股份比例
      let canReceiveProfitStocks = 0;
      const canReceiveProfitDirectorList = [];
      dbDirectors
        .find({companyId}, {
          sort: {
            stocks: -1,
            createdAt: 1
          },
          fields: {
            userId: 1,
            stocks: 1
          }
        })
        .forEach((directorData) => {
          if (directorData.userId === '!system' || directorData.userId === '!FSC') {
            return true;
          }
          const userData = Meteor.users.findOne(directorData.userId, {
            fields: {
              'status.lastLogin.date': 1
            }
          });
          //七天未動作者不分紅
          if (userData.status && now - userData.status.lastLogin.date.getTime() <= 604800000) {
            canReceiveProfitStocks += directorData.stocks;
            canReceiveProfitDirectorList.push({
              userId: directorData.userId,
              stocks: directorData.stocks
            });
          }
        });
        _.each(canReceiveProfitDirectorList, (directorData, index) => {
          const directorProfit = Math.min(Math.ceil(forDirectorProfit * directorData.stocks / canReceiveProfitStocks), leftProfit);
          if (directorProfit > 0) {
            logBulk.insert({
              logType: '營利分紅',
              userId: [directorData.userId],
              companyId: companyId,
              amount: directorProfit,
              createdAt: new Date(now + 2 + index)
            });
            usersBulk
              .find({
                _id: directorData.userId
              })
              .updateOne({
                $inc: {
                  'profile.money': directorProfit
                }
              });
            needExecuteUserBulk = true;
            leftProfit -= directorProfit;
          }
        });
    });
  if (needExecuteLogBulk) {
    logBulk.execute();
  }
  if (needExecuteUserBulk) {
    usersBulk.execute();
  }
}

//選舉新的經理人
function electManager(seasonData) {
  debug.log('electManager');
  const electMessage = (
    convertDateToText(seasonData.beginDate) +
    '～' +
    convertDateToText(seasonData.endDate)
  );
  dbCompanies
    .find(
      {
        $or: [
          {
            //至少存在兩名候選人
            'candidateList.1': {
              $exists: true
            }
          },
          {
            //當前沒有負責的經理人
            manager: '!none'
          }
        ],
        isSeal: false
      },
      {
        fields: {
          _id: 1,
          candidateList: 1
        },
        disableOplog: true
      }
    )
    .forEach((companyData) => {
      //沒有經理人也沒有競選人的情況，不予處理
      if (companyData.candidateList.length === 0) {
        return true;
      }
      const companyId = companyData._id;
      //先鎖定資源，再重新讀取一次資料進行運算
      resourceManager.request('electManager', ['elect' + companyId], (release) => {
        const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
        const companiesBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
        const companyData = dbCompanies.findOne(companyId, {
          fields: {
            _id: 1,
            manager: 1,
            candidateList: 1,
            voteList: 1
          },
          disableOplog: true
        });
        //沒有經理人且只有一位競選人的情況下，直接當選
        if (companyData.candidateList.length === 1) {
          logBulk.insert({
            logType: '就任經理',
            userId: companyData.candidateList,
            companyId: companyId,
            message: electMessage,
            createdAt: new Date()
          });
          companiesBulk
            .find({
              _id: companyId
            })
            .updateOne({
              $set: {
                manager: companyData.candidateList[0],
                candidateList: companyData.candidateList.slice(),
                voteList: [ [] ]
              }
            });
        }
        else {
          const voteList = companyData.voteList;
          const directorList = dbDirectors
            .find({companyId}, {
              fields: {
                userId: 1,
                stocks: 1
              },
              disableOplog: true
            })
            .fetch();

          const voteStocksList = _.map(companyData.candidateList, (candidate, index) => {
            const voteDirectorList = voteList[index];
            let stocks = _.reduce(voteDirectorList, (stocks, userId) => {
              const directorData = _.findWhere(directorList, {userId});

              return stocks + (directorData ? directorData.stocks : 0);
            }, 0);

            return {
              userId: candidate,
              stocks: stocks
            };
          });
          const sortedVoteStocksList = _.sortBy(voteStocksList, 'stocks');
          const winnerStocks = _.last(sortedVoteStocksList).stocks;
          const winnerData = _.findWhere(voteStocksList, {
            stocks: winnerStocks
          });
          logBulk.insert({
            logType: '就任經理',
            userId: [winnerData.userId, companyData.manager],
            companyId: companyId,
            message: electMessage,
            amount: winnerData.stocks,
            createdAt: new Date()
          });
          companiesBulk
            .find({
              _id: companyId
            })
            .updateOne({
              $set: {
                manager: winnerData.userId,
                candidateList: [winnerData.userId],
                voteList: [ [] ]
              }
            });
        }
        release();
        logBulk.execute();
        companiesBulk.execute();
      });
    });
  dbSeason.update(seasonData._id, {
    $unset: {
      electTime: ''
    }
  });
}
function convertDateToText(date) {
  const dateInTimeZone = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000 * -1);

  return (
    dateInTimeZone.getFullYear() + '/' +
    padZero(dateInTimeZone.getMonth() + 1) + '/' +
    padZero(dateInTimeZone.getDate()) + ' ' +
    padZero(dateInTimeZone.getHours()) + ':' +
    padZero(dateInTimeZone.getMinutes())
  );
}
function padZero(n) {
  if (n < 10) {
    return '0' + n;
  }
  else {
    return n;
  }
}
