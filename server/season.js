'use strict';
import { Meteor } from 'meteor/meteor';
import { config } from '../config';
import { resourceManager } from './resourceManager';
import { dbSeason } from '../db/dbSeason';
import { dbProducts } from '../db/dbProducts';

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
      // earnProfitFromProduct();
      //產生新的商業季度
      generateNewSeason();
      //若有正在競選經理人的公司，則計算出選舉結果。
      // electManager();
      release();
    });
  }
}

//產生新的商業季度
export function generateNewSeason() {
  const beginDate = new Date();
  const endDate = new Date(beginDate.getTime() + config.seasonTime);
  const userCount = Meteor.users.find().count();
  const productCount = dbProducts.find({overdue: 0}).count();
  //本季度每個使用者可以得到多少推薦票
  const vote = Math.max(Math.floor(productCount / 10), 1);
  //每個使用者在每個季度可產生的營利是在投票時產生的
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

