'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { resourceManager } from './resourceManager';
import { dbAdvertising } from '../db/dbAdvertising';
import { dbCompanies } from '../db/dbCompanies';
import { dbDirectors } from '../db/dbDirectors';
import { dbLog } from '../db/dbLog';
import { dbPrice } from '../db/dbPrice';
import { dbProducts } from '../db/dbProducts';
import { dbRankCompanyPrice } from '../db/dbRankCompanyPrice';
import { dbRankCompanyProfit } from '../db/dbRankCompanyProfit';
import { dbRankCompanyValue } from '../db/dbRankCompanyValue';
import { dbRankUserWealth } from '../db/dbRankUserWealth';
import { dbResourceLock } from '../db/dbResourceLock';
import { dbSeason } from '../db/dbSeason';
import { dbVoteRecord } from '../db/dbVoteRecord';
import { checkFoundCompany } from './foundation';
import { paySalary } from './salary';
import { recordListPrice, releaseStocksForHighPrice, releaseStocksForNoDeal } from './company';
import { threadId, shouldReplaceThread } from './thread';
import { config } from '../config';

Meteor.startup(function() {
  Meteor.setInterval(intervalCheck, config.intervalTimer);
});

function intervalCheck() {
  const inrervalCheckLock = dbResourceLock.findOne('intervalCheck');
  if (! inrervalCheckLock) {
    dbResourceLock.insert({
      _id: 'intervalCheck',
      task: 'intervalCheck',
      threadId: threadId,
      time: new Date()
    });
    doIntervalWork();
  }
  else if ((Date.now() - inrervalCheckLock.time.getTime()) > (config.intervalTimer * 3)) {
    dbResourceLock.update('intervalCheck', {
      $set: {
        threadId: threadId,
        time: new Date()
      }
    });
    doIntervalWork();
  }
  else if (inrervalCheckLock.threadId === threadId) {
    dbResourceLock.update('intervalCheck', {
      $set: {
        time: new Date()
      }
    });
    doIntervalWork();
  }
  else if (shouldReplaceThread(inrervalCheckLock.threadId)) {
    dbResourceLock.update('intervalCheck', {
      $set: {
        threadId: threadId,
        time: new Date()
      }
    });
    doIntervalWork();
  }
}

//週期檢查工作內容
function doIntervalWork() {
  const lastSeasonData = dbSeason.findOne({}, {
    sort: {
      beginDate: -1
    }
  });
  if (! lastSeasonData) {
    //產生新的商業季度
    generateNewSeason();    
  }
  else if (Date.now() >= lastSeasonData.endDate.getTime()) {
    //商業季度結束檢查
    doSeasonWorks(lastSeasonData);
  }
  else {
    //檢查所有創立中且投資時間截止的公司是否成功創立
    checkFoundCompany();
    //當發薪時間到時，發給所有驗證通過的使用者薪水
    paySalary();
    //隨機時間讓符合條件的公司釋出股票
    releaseStocksForHighPrice();
    releaseStocksForNoDeal();
    //隨機時間紀錄公司的參考價格
    recordListPrice();
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
      dbResourceLock.remove(dbResourceLock._id);
    });
}

//商業季度結束檢查
function doSeasonWorks(lastSeasonData) {
  console.info(new Date().toLocaleString() + ': doSeasonWorks');
  resourceManager.request('doSeasonWorks', ['season'], (release) => {
    //當商業季度結束時，結算所有公司的營利額並按照股權分給股東。
    giveBonusByStocksFromProfit();
    //為所有公司與使用者進行排名結算
    generateRankData(lastSeasonData);
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
    //若有正在競選經理人的公司，則計算出選舉結果。
    electManager(lastSeasonData);
    //產生新的商業季度
    generateNewSeason();
    //移除所有七天前的股價紀錄
    dbPrice.remove({
      createdAt: {
        $lt: new Date( Date.now() - 604800000 )
      }
    });
    //移除所有推薦票投票紀錄
    dbVoteRecord.remove();
    release();
  });
}

//產生新的商業季度
function generateNewSeason() {
  const beginDate = new Date();
  const endDate = new Date(beginDate.getTime() + config.seasonTime);
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
  const seasonId = dbSeason.insert({beginDate, endDate, userCount, productCount, votePrice});

  return seasonId;
}

//為所有公司與使用者進行排名結算
function generateRankData(seasonData) {
  // console.log('begining generate rank data...');
  // console.log('begining rank company price...');
  const rankCompanyPriceList = dbCompanies
    .find({}, {
      fields: {
        _id: 1,
        lastPrice: 1,
        listPrice: 1,
        totalRelease: 1,
        totalValue: 1,
        profit: 1
      },
      sort: {
        lastPrice: -1
      },
      limit: 100,
      disableOplog: true
    })
    .fetch();
  // console.log('done rank company price...');

  // console.log('begining rank company value...');
  const rankCompanyValueList = dbCompanies
    .find({}, {
      fields: {
        _id: 1,
        lastPrice: 1,
        listPrice: 1,
        totalRelease: 1,
        totalValue: 1,
        profit: 1
      },
      sort: {
        totalValue: -1
      },
      limit: 100,
      disableOplog: true
    })
    .fetch();
  // console.log('done rank company value...');

  // console.log('begining rank company profit...');
  const rankCompanyProfitList = dbCompanies
    .find({}, {
      fields: {
        _id: 1,
        lastPrice: 1,
        listPrice: 1,
        totalRelease: 1,
        totalValue: 1,
        profit: 1
      },
      sort: {
        profit: -1
      },
      limit: 100,
      disableOplog: true
    })
    .fetch();
  // console.log('done rank company profit...');

  // console.log('begining rank user...');
  const rankUserList = dbDirectors.aggregate([
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
        userId: 1,
        companyId: 1,
        stocks: 1,
        listPrice: {
          $arrayElemAt: ['$companyData.listPrice', 0]
        }
      }
    },
    {
      $group: {
        _id: '$userId',
        stocksValue: {
          $sum: {
            $multiply: ['$stocks', '$listPrice']
          }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userData'
      }
    },
    {
      $project: {
        companyId: 1,
        stocksValue: 1,
        money: {
          $arrayElemAt: ['$userData.profile.money', 0]
        }
      }
    },
    {
      $project: {
        companyId: 1,
        money: 1,
        stocksValue: 1,
        wealth: {
          $add: ['$money', '$stocksValue']
        }
      }
    },
    {
      $sort: {
        wealth: -1
      }
    },
    {
      $limit : 100
    }
  ]);
  // console.log('done rank user...');

  const seasonId = seasonData._id;

  if (rankCompanyPriceList.length > 0) {
    // console.log('start insert company\'s price rank data...');
    const rankCompanyPriceBulk = dbRankCompanyPrice.rawCollection().initializeUnorderedBulkOp();
    _.each(rankCompanyPriceList, (rankData) => {
      rankCompanyPriceBulk.insert({
        seasonId: seasonId,
        companyId: rankData._id,
        lastPrice: rankData.lastPrice,
        listPrice: rankData.listPrice,
        totalRelease: rankData.totalRelease,
        totalValue: rankData.totalValue,
        profit: rankData.profit
      });
    });
    rankCompanyPriceBulk.execute();
    // console.log('done insert company\'s price rank data...');

    // console.log('start insert company\'s value rank data...');
    const rankCompanyValueBulk = dbRankCompanyValue.rawCollection().initializeUnorderedBulkOp();
    _.each(rankCompanyValueList, (rankData) => {
      rankCompanyValueBulk.insert({
        seasonId: seasonId,
        companyId: rankData._id,
        lastPrice: rankData.lastPrice,
        listPrice: rankData.listPrice,
        totalRelease: rankData.totalRelease,
        totalValue: rankData.totalValue,
        profit: rankData.profit
      });
    });
    rankCompanyValueBulk.execute();
    // console.log('done insert company\'s value rank data...');

    // console.log('start insert company\'s profit rank data...');
    const rankCompanyProfitBulk = dbRankCompanyProfit.rawCollection().initializeUnorderedBulkOp();
    _.each(rankCompanyProfitList, (rankData) => {
      rankCompanyProfitBulk.insert({
        seasonId: seasonId,
        companyId: rankData._id,
        lastPrice: rankData.lastPrice,
        listPrice: rankData.listPrice,
        totalRelease: rankData.totalRelease,
        totalValue: rankData.totalValue,
        profit: rankData.profit
      });
    });
    rankCompanyProfitBulk.execute();
    // console.log('done insert company\'s profit rank data...');
  }

  if (rankUserList.length > 0) {
    // console.log('start insert user\'s rank data...');
    const rankUserBulk = dbRankUserWealth.rawCollection().initializeUnorderedBulkOp();
    _.each(rankUserList, (rankData) => {
      rankUserBulk.insert({
        seasonId: seasonId,
        userId: rankData._id,
        money: rankData.money,
        stocksValue: rankData.stocksValue
      });
    });
    rankUserBulk.execute();
    // console.log('done insert user\'s rank data...');
  }
}

//當商業季度結束時，結算所有公司的營利額並按照股權分給股東。
function giveBonusByStocksFromProfit() {
  const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
  let needExecuteLogBulk = false;
  const usersBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();
  let needExecuteUserBulk = false;
  dbCompanies
    .find(
      {
        profit: {
          $gt: 0
        }
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
        resolve: false,
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
          resolve: false,
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
      const totalReleaseStocks = companyData.totalRelease;
      //發放營利給所有董事
      dbDirectors
        .find({companyId}, {
          sort: {
            stocks: -1,
            createdAt: 1
          },
          fields: {
            userId: 1,
            stocks: 1
          },
          disableOplog: true
        })
        .forEach((director, index) => {
          const directorProfit = Math.min(Math.ceil(forDirectorProfit * director.stocks / totalReleaseStocks), leftProfit);
          if (directorProfit > 0) {
            logBulk.insert({
              logType: '營利分紅',
              userId: [director.userId],
              companyId: companyId,
              amount: directorProfit,
              resolve: false,
              createdAt: new Date( now + 2 + index)
            });
            usersBulk
              .find({
                _id: director.userId
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
        ]
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
            resolve: false,
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
            resolve: false,
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
