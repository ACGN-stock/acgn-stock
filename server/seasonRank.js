'use strict';
import { _ } from 'meteor/underscore';
import { dbCompanies } from '../db/dbCompanies';
import { dbDirectors } from '../db/dbDirectors';
import { dbRankCompanyPrice } from '../db/dbRankCompanyPrice';
import { dbRankCompanyProfit } from '../db/dbRankCompanyProfit';
import { dbRankCompanyValue } from '../db/dbRankCompanyValue';
import { dbRankUserWealth } from '../db/dbRankUserWealth';

//為所有公司與使用者進行排名結算
export function generateRankData(seasonData) {
  // console.log('begining generate rank data...');
  // console.log('begining rank company price...');
  const rankCompanyPriceList = dbCompanies
    .find(
      {
        isSeal: false
      },
      {
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
      }
    )
    .fetch();
  // console.log('done rank company price...');

  // console.log('begining rank company value...');
  const rankCompanyValueList = dbCompanies
    .find(
      {
        isSeal: false
      },
        {
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
      }
    )
    .fetch();
  // console.log('done rank company value...');

  // console.log('begining rank company profit...');
  const rankCompanyProfitList = dbCompanies
    .find(
      {
        isSeal: false
      },
      {
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
      }
    )
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
      $unwind: '$companyData'
    },
    {
      $match: {
        'companyData.isSeal': false
      }
    },
    {
      $project: {
        userId: 1,
        stockValue: {
          $multiply: ['$stocks', '$companyData.listPrice']
        }
      }
    },
    {
      $group: {
        _id: '$userId',
        stocksValue: {
          $sum: '$stockValue'
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
        _id: 1,
        stocksValue: 1,
        money: {
          $arrayElemAt: ['$userData.profile.money', 0]
        }
      }
    },
    {
      $project: {
        _id: 1,
        stocksValue: 1,
        money: 1,
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