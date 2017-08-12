'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { config } from '../config';
import { resourceManager } from './resourceManager';
import { dbCompanies } from '../db/dbCompanies';
import { dbDirectors } from '../db/dbDirectors';
import { dbProducts } from '../db/dbProducts';
import { dbRankCompanyPrice } from '../db/dbRankCompanyPrice';
import { dbRankCompanyProfit } from '../db/dbRankCompanyProfit';
import { dbRankCompanyValue } from '../db/dbRankCompanyValue';
import { dbRankUserWealth } from '../db/dbRankUserWealth';
import { dbSeason } from '../db/dbSeason';
import { dbLog } from '../db/dbLog';

//商業季度結束檢查
export function doSeasonWorks() {
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
    resourceManager.request('season', ['season'], (release) => {
      //當商業季度結束時，結算所有公司的營利額並按照股權分給股東。
      giveBonusByStocksFromProfit();
      //為所有公司與使用者進行排名結算
      generateRankData(lastSeasonData);
      //所有公司當季營利額歸零
      dbCompanies.update(
        {},
        {
          $set: {
            profit: 0
          }
        },
        {
          multi: true
        }
      );
      release();
    });
    //若有正在競選經理人的公司，則計算出選舉結果。
    electManager(lastSeasonData);
    //產生新的商業季度
    generateNewSeason();
  }
}

//產生新的商業季度
function generateNewSeason() {
  const beginDate = new Date();
  const endDate = new Date(beginDate.getTime() + config.seasonTime);
  const userCount = Meteor.users.find().count();
  const productCount = dbProducts.find({overdue: 0}).count();
  //本季度每個使用者可以得到多少推薦票
  const vote = Math.max(Math.floor(productCount / 10), 1);
  const votePrice = Math.round(config.seasonProfitPerUser / vote * 100) / 100;
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
  console.log('begining generate rank data...');
  console.log('begining rank company price...');
  const rankCompanyPriceList = dbCompanies
    .find({}, {
      fields: {
        companyName: 1,
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
  console.log('done rank company price...');

  console.log('begining rank company value...');
  const rankCompanyValueList = dbCompanies
    .find({}, {
      fields: {
        companyName: 1,
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
  console.log('done rank company value...');

  console.log('begining rank company profit...');
  const rankCompanyProfitList = dbCompanies
    .find({}, {
      fields: {
        companyName: 1,
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
  console.log('done rank company profit...');

  console.log('begining rank user...');
  const rankUserList = dbDirectors.aggregate([
    {
      $lookup: {
        from: 'companies',
        localField: 'companyName',
        foreignField: 'companyName',
        as: 'companyData'
      }
    },
    {
      $project: {
        username: 1,
        companyName: 1,
        stocks: 1,
        listPrice: {
          $arrayElemAt: ['$companyData.listPrice', 0]
        }
      }
    },
    {
      $group: {
        _id: '$username',
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
        foreignField: 'username',
        as: 'userData'
      }
    },
    {
      $project: {
        companyName: 1,
        stocksValue: 1,
        money: {
          $arrayElemAt: ['$userData.profile.money', 0]
        }
      }
    },
    {
      $project: {
        companyName: 1,
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
  console.log('done rank user...');

  const seasonId = seasonData._id;

  if (rankCompanyPriceList.length > 0) {
    console.log('start insert company\'s price rank data...');
    const rankCompanyPriceBulk = dbRankCompanyPrice.rawCollection().initializeUnorderedBulkOp();
    _.each(rankCompanyPriceList, (rankData) => {
      rankCompanyPriceBulk.insert({
        seasonId: seasonId,
        companyName: rankData.companyName,
        lastPrice: rankData.lastPrice,
        listPrice: rankData.listPrice,
        totalRelease: rankData.totalRelease,
        totalValue: rankData.totalValue,
        profit: rankData.profit
      });
    });
    rankCompanyPriceBulk.execute();
    console.log('done insert company\'s price rank data...');

    console.log('start insert company\'s value rank data...');
    const rankCompanyValueBulk = dbRankCompanyValue.rawCollection().initializeUnorderedBulkOp();
    _.each(rankCompanyValueList, (rankData) => {
      rankCompanyValueBulk.insert({
        seasonId: seasonId,
        companyName: rankData.companyName,
        lastPrice: rankData.lastPrice,
        listPrice: rankData.listPrice,
        totalRelease: rankData.totalRelease,
        totalValue: rankData.totalValue,
        profit: rankData.profit
      });
    });
    rankCompanyValueBulk.execute();
    console.log('done insert company\'s value rank data...');

    console.log('start insert company\'s profit rank data...');
    const rankCompanyProfitBulk = dbRankCompanyProfit.rawCollection().initializeUnorderedBulkOp();
    _.each(rankCompanyProfitList, (rankData) => {
      rankCompanyProfitBulk.insert({
        seasonId: seasonId,
        companyName: rankData.companyName,
        lastPrice: rankData.lastPrice,
        listPrice: rankData.listPrice,
        totalRelease: rankData.totalRelease,
        totalValue: rankData.totalValue,
        profit: rankData.profit
      });
    });
    rankCompanyProfitBulk.execute();
    console.log('done insert company\'s profit rank data...');
  }

  if (rankUserList.length > 0) {
    console.log('start insert user\'s rank data...');
    const rankUserBulk = dbRankUserWealth.rawCollection().initializeUnorderedBulkOp();
    _.each(rankUserList, (rankData) => {
      rankUserBulk.insert({
        seasonId: seasonId,
        username: rankData._id,
        money: rankData.money,
        stocksValue: rankData.stocksValue
      });
    });
    rankUserBulk.execute();
    console.log('done insert user\'s rank data...');
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
          companyName: 1,
          manager: 1,
          totalRelease: 1,
          profit: 1
        },
        disableOplog: true
      }
    )
    .forEach((companyData) => {
      const now = Date.now();
      const companyName = companyData.companyName;
      console.log('start give bonous of company[' + companyName + ']...');
      let leftProfit = companyData.profit;
      console.log('total bonus: $' + companyData.profit);
      logBulk.insert({
        logType: '公司營利',
        companyName: companyName,
        amount: leftProfit,
        resolve: false,
        createdAt: new Date(now)
      });
      needExecuteLogBulk = true;
      //經理人分紅
      if (companyData.manager !== '!none') {
        const managerProfit = Math.ceil(leftProfit * config.managerProfitPercent);
        // console.log('manager bonus: $' + managerProfit);
        logBulk.insert({
          logType: '營利分紅',
          username: [companyData.manager],
          companyName: companyName,
          amount: managerProfit,
          resolve: false,
          createdAt: new Date(now + 1)
        });
        usersBulk
          .find({
            username: companyData.manager
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
      // console.log('left bonus: $' + leftProfit);
      const totalReleaseStocks = companyData.totalRelease;
      // console.log('totalRelease stocks: ' + totalReleaseStocks);
      //發放營利給所有董事
      dbDirectors
        .find({companyName}, {
          sort: {
            stocks: -1,
            createdAt: 1
          },
          disableOplog: true
        })
        .forEach((director, index) => {
          // console.log('director[' + director.username + '] stocks: ' + director.stocks);
          const directorProfit = Math.min(Math.ceil(leftProfit * director.stocks / totalReleaseStocks), leftProfit);
          // console.log('director[' + director.username + '] bonus: $' + directorProfit);
          if (directorProfit > 0) {
            logBulk.insert({
              logType: '營利分紅',
              username: [director.username],
              companyName: companyName,
              amount: directorProfit,
              resolve: false,
              createdAt: new Date( now + 2 + index)
            });
            usersBulk
              .find({
                username: director.username
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
          companyName: 1,
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
      const companyName = companyData.companyName;
      //先鎖定資源，再重新讀取一次資料進行運算
      resourceManager.request('electManager', ['elect' + companyName], (release) => {
        const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
        const companiesBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
        const companyData = dbCompanies.findOne({companyName}, {
          fields: {
            _id: 1,
            companyName: 1,
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
            username: companyData.candidateList.slice(),
            companyName: companyName,
            message: electMessage,
            resolve: false,
            createdAt: new Date()
          });
          companiesBulk
            .find({
              companyName: companyName
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
            .find({companyName}, {
              fields: {
                username: 1,
                stocks: 1
              },
              disableOplog: true
            })
            .fetch();

          const voteStocksList = _.map(companyData.candidateList, (candidate, index) => {
            const voteDirectorList = voteList[index];
            let stocks = _.reduce(voteDirectorList, (stocks, username) => {
              const directorData = _.findWhere(directorList, {username});

              return stocks + (directorData ? directorData.stocks : 0);
            }, 0);

            return {
              username: candidate,
              stocks: stocks
            };
          });
          const sortedVoteStocksList = _.sortBy(voteStocksList, 'stocks');
          const winnerData = _.last(sortedVoteStocksList);
          logBulk.insert({
            logType: '就任經理',
            username: [winnerData.username, companyData.manager],
            companyName: companyName,
            message: electMessage,
            amount: winnerData.stocks,
            resolve: false,
            createdAt: new Date()
          });
          companiesBulk
            .find({
              companyName: companyName
            })
            .updateOne({
              $set: {
                manager: winnerData.username,
                candidateList: [winnerData.username],
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
  return (
    date.getFullYear() + '/' +
    padZero(date.getMonth() + 1) + '/' +
    padZero(date.getDate()) + ' ' +
    padZero(date.getHours()) + ':' +
    padZero(date.getMinutes())
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
