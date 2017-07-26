'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { lockManager } from '../methods/lockManager';
import { dbProducts } from '../db/dbProducts';
import { dbCompanies } from '../db/dbCompanies';
import { dbLog } from '../db/dbLog';
import { dbDirectors } from '../db/dbDirectors';
import { config } from '../config';

export function earnProfit() {
  const unlock = lockManager.lock(['product'], true);
  //總收益由config與當前驗證通過的使用者數量有關
  const allProfit = config.seasonProfitPerUser * Meteor.users.find({}, {disableOplog: true}).count();
  //取出所有參加本季度投票競賽的產品
  const allVotingProducts = dbProducts.find({overdue: 1}, {disableOplog: true}).fetch();
  //取出所有參加本季度產品投票競賽的公司
  const companyProductsHash = _.groupBy(allVotingProducts, 'companyName');
  //只有排行在前十分之一的公司數量（只有這些公司會有收益）
  const haveProfitCompaniesNumber = Math.ceil(_.size(companyProductsHash) / 10);
  //基本收益值為總收益的數量除以有收益公司的數量再除以4
  const baseProfit = allProfit / haveProfitCompaniesNumber / 4;
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
  //將總收益的1/4均分給所有有營利的公司
  _.each(companyProfitList, (companyProfit) => {
    companyProfit.profit += Math.ceil(baseProfit / haveProfitCompaniesNumber);
  });
  //將總收益的1/4再均分給排名在所有有營利公司前半的公司
  _.each(_.last(companyProfitList, haveProfitCompaniesNumber / 2), (companyProfit, index, haveProfitCompanies) => {
    companyProfit.profit += Math.ceil(baseProfit / haveProfitCompanies.length);
  });
  //將總收益的1/4再均分給排名在所有有營利公司前三名的公司
  _.each(_.last(companyProfitList, 3), (companyProfit) => {
    companyProfit.profit += baseProfit / 3;
  });
  //將總收益的1/4再發給排名第一的公司
  _.each(_.last(companyProfitList), (companyProfit) => {
    companyProfit.profit += baseProfit;
  });
  //發放收益給公司經理人與董事會
  _.each(companyProfitList, (companyProfit) => {
    const name = companyProfit.companyName;    
    const companyData = dbCompanies.findOne({name});
    if (companyData) {
      const unlock = lockManager.lock([companyData.name], true);
      dbLog.insert({
        logType: '公司營利',
        companyName: name,
        amount: totalProfit,
        createdAt: new Date()
      });
      //經理人分紅
      const managerProfit = Math.ceil(companyProfit.profit * config.managerProfitPercent);
      dbLog.insert({
        logType: '營利分紅',
        username: [companyData.manager],
        companyName: name,
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
      const totalProfit = companyProfit.profit - managerProfit;
      let leftProfit = totalProfit;
      const totalReleaseStocks = companyData.totalRelease;
      //發放營利給所有董事
      dbDirectors.find({
        companyName: name
      }, {
        sort: {
          stocks: -1
        }
      })
      .forEach((director) => {
        const directorProfit = Math.min(Math.ceil(totalProfit * director.stocks / totalReleaseStocks), leftProfit);
        dbLog.insert({
          logType: '營利分紅',
          username: [director.username],
          companyName: name,
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
      });
      unlock();
    }
  });
  //所有投票榜上的產品下榜
  dbProducts.update({
    overdue: 1
  }, {
    $set: {
      overdue: 2
    }
  });
  //依當季推出的產品數量重設所有使用者的推薦票數
  const newVoteNumber = Math.floor(dbProducts.find({overdue: 0}, {disableOplog: true}).count() / 10);
  Meteor.users.update({}, {
    $set: {
      'profile.vote': newVoteNumber
    }
  });
  //所有當季推出的產品進投票榜
  dbProducts.update({
    overdue: 0
  }, {
    $set: {
      overdue: 1
    }
  });
  unlock();
}
