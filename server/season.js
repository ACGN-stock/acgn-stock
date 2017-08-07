'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { config } from '../config';
import { resourceManager } from './resourceManager';
import { dbCompanies } from '../db/dbCompanies';
import { dbDirectors } from '../db/dbDirectors';
import { dbSeason } from '../db/dbSeason';
import { dbProducts } from '../db/dbProducts';
import { dbLog } from '../db/dbLog';

//商業季度結束檢查
export function doSeasonWorks() {
  let lastSeasonData = dbSeason.findOne({}, {
    sort: {
      beginDate: -1
    }
  });
  if (! lastSeasonData) {
    const newSeasonId = generateNewSeason();
    lastSeasonData = dbSeason.findOne(newSeasonId);
  }
  if (Date.now() >= lastSeasonData.endDate.getTime()) {
    resourceManager.request('doSeasonWorks', ['season'], (release) => {
      //當商業季度結束時，結算所有公司的營利額並按照股權分給股東。
      earnProfitFromProduct(lastSeasonData);
      //產生新的商業季度
      generateNewSeason();
      //若有正在競選經理人的公司，則計算出選舉結果。
      // electManager();
      release();
    });
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
  //每個使用者在每個季度可產生的營利有二分之一是在投票時就產生的
  const votePrice = Math.round(config.seasonProfitPerUser / 2 / vote * 100) / 100;
  Meteor.users.update({}, {
    $set: {
      'profile.vote': vote
    }
  });
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

//當商業季度結束時，結算所有公司的營利額並按照股權分給股東。
function earnProfitFromProduct(seasonData) {
  //每個使用者在每個季度可產生的營利有二分之一只分給排行榜上的公司
  const rankProfit = Math.round(config.seasonProfitPerUser / 2 * seasonData.userCount);
  //取出所有參加本季度投票競賽的產品
  const allVotingProducts = dbProducts
    .find(
      {
        overdue: 1
      },
      {
        disableOplog: true
      }
    )
    .fetch();
  if (allVotingProducts.length > 0) {
    //取出所有參加本季度產品投票競賽的公司
    const companyProductsHash = _.groupBy(allVotingProducts, 'companyName');
    //只有排行在前十分之一的公司數量（只有這些公司會有排行收益）
    const haveProfitCompaniesNumber = Math.ceil(_.size(companyProductsHash) / 10);
    //基本收益值為總收益的數量除以有排行收益公司的數量再除以4
    const baseProfit = rankProfit / haveProfitCompaniesNumber / 4;
    //取出擁有收益的公司資料
    const companyProfitList = _.chain(companyProductsHash)
      .map((productList, companyName) => {
        return {
          companyName: companyName,
          profit: 0,
          totalVotes: _.reduce(productList, (totalVotes, productData) => {
            return totalVotes + productData.votes;
          }, 0)
        };
      })
      .sortBy('totalVotes')
      .last(haveProfitCompaniesNumber)
      .value();
    //將總排行收益的1/4均分給所有有營利的公司
    _.each(companyProfitList, (companyProfit) => {
      companyProfit.profit += Math.ceil(baseProfit / haveProfitCompaniesNumber);
    });
    //將總排行收益的1/4再均分給排名在所有有營利公司前半的公司
    _.each(_.last(companyProfitList, haveProfitCompaniesNumber / 2), (companyProfit, index, haveProfitCompanies) => {
      companyProfit.profit += Math.ceil(baseProfit / haveProfitCompanies.length);
    });
    //將總排行收益的1/4再均分給排名在所有有營利公司前三名的公司
    _.each(_.last(companyProfitList, 3), (companyProfit) => {
      companyProfit.profit += baseProfit / 3;
    });
    //將總排行收益的1/4再發給排名第一的公司
    _.last(companyProfitList).profit += baseProfit;
    //發放收益給公司經理人與董事會
    _.each(companyProfitList, (companyProfit) => {
      const companyName = companyProfit.companyName;    
      const companyData = dbCompanies.findOne({companyName});
      if (companyData) {
        const totalProfit = companyData.profit;
        dbLog.insert({
          logType: '公司營利',
          companyName: companyName,
          amount: totalProfit,
          createdAt: new Date()
        });
        let leftProfit = totalProfit;
        if (companyData.manager !== '!none') {
          const managerProfit = Math.ceil(totalProfit * config.managerProfitPercent);
          //經理人分紅
          dbLog.insert({
            logType: '營利分紅',
            username: [companyData.manager],
            companyName: companyName,
            amount: managerProfit,
            createdAt: new Date()
          });
          Meteor.users.update({
            username: companyData.manager
          }, {
            $inc: {
              'profile.money': managerProfit
            }
          });
          leftProfit -= managerProfit;
        }
        //剩餘收益先扣去公司營運成本
        leftProfit -= Math.ceil(totalProfit * config.costFromProfit);
        const totalReleaseStocks = companyData.totalRelease;
        //發放營利給所有董事
        dbDirectors.find({
          companyName: companyName
        }, {
          sort: {
            stocks: -1
          }
        })
        .forEach((director) => {
          const directorProfit = Math.min(Math.ceil(leftProfit * director.stocks / totalReleaseStocks), leftProfit);
          if (directorProfit > 0) {
            dbLog.insert({
              logType: '營利分紅',
              username: [director.username],
              companyName: companyName,
              amount: directorProfit,
              createdAt: new Date()
            });
            Meteor.users.update({
              username: director.username
            }, {
              $inc: {
                'profile.money': directorProfit
              }
            });
            leftProfit -= directorProfit;            
          }
        });
      }
    });
  }
}

