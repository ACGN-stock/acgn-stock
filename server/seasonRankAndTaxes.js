'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { dbCompanies } from '../db/dbCompanies';
import { dbDirectors } from '../db/dbDirectors';
import { dbLog } from '../db/dbLog';
import { dbRankCompanyPrice } from '../db/dbRankCompanyPrice';
import { dbRankCompanyProfit } from '../db/dbRankCompanyProfit';
import { dbRankCompanyValue } from '../db/dbRankCompanyValue';
import { dbRankUserWealth } from '../db/dbRankUserWealth';
import { dbTaxes } from '../db/dbTaxes';
import { debug } from './debug';
import { config } from '../config';

//為所有公司與使用者進行排名結算
export function generateRankAndTaxesData(seasonData) {
  debug.log('generateRankAndTaxesData', seasonData);
  rankCompany(seasonData);
  const hasStockUserWealthList = generateHasStockUserWealthList();
  rankHasStockUser(_.first(hasStockUserWealthList, 100), seasonData);
  const noStockUserWealthList = generateNoStockUserWealthList();
  const userWealthList = hasStockUserWealthList.concat(noStockUserWealthList);
  generateUserTaxes(userWealthList);
  const usersBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();
  _.each(userWealthList, (wealthData) => {
    usersBulk
      .find({
        _id: wealthData._id
      })
      .updateOne({
        $set: {
          'profile.lastSeasonTotalWealth': wealthData.totalWealth
        }
      });
  });
  usersBulk.execute();
}

function rankCompany(seasonData) {
  if (dbCompanies.find().count() > 0) {
    const rankCompanyPriceList = dbLog.aggregate([
      {
        $match: {
          logType: '交易紀錄',
          createdAt: {
            $gt: seasonData.beginDate
          }
        }
      },
      {
        $project: {
          companyId: 1,
          dealAmount: '$amount',
          dealMoney: {
            $multiply: ['$amount', '$price']
          }
        }
      },
      {
        $group: {
          _id: '$companyId',
          totalDealAmount: {
            $sum: '$dealAmount'
          },
          totalDealMoney: {
            $sum: '$dealMoney'
          }
        }
      },
      {
        $lookup: {
          from: 'companies',
          localField: '_id',
          foreignField: '_id',
          as: 'companyData'
        }
      },
      {
        $project: {
          _id: 1,
          totalDealAmount: 1,
          totalDealMoney: 1,
          isSeal: {
            $arrayElemAt: ['$companyData.isSeal', 0]
          }
        }
      },
      {
        $match: {
          isSeal: false
        }
      },
      {
        $project: {
          _id: 1,
          totalDealAmount: 1,
          totalDealMoney: 1
        }
      },
      {
        $lookup: {
          from: 'voteRecord',
          localField: '_id',
          foreignField: 'companyId',
          as: 'voteData'
        }
      },
      {
        $project: {
          _id: 1,
          totalDealAmount: 1,
          totalDealMoney: 1,
          productProfit: {
            $multiply: [
              {
                $size: '$voteData'
              },
              seasonData.votePrice
            ]
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalDealAmount: 1,
          totalDealMoney: 1,
          productProfit: 1,
          totalMoney: {
            $add: [
              '$totalDealMoney',
              '$productProfit'
            ]
          }
        }
      },
      {
        $sort: {
          totalMoney: -1,
          totalDealMoney: -1
        }
      },
      {
        $limit : 100
      }
    ]);

    const rankCompanyValueList = dbCompanies
      .find(
        {
          isSeal: false
        },
          {
          fields: {
            _id: 1,
            lastPrice: 1,
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

    const rankCompanyProfitList = dbLog.aggregate([
      {
        $match: {
          logType: '交易紀錄',
          createdAt: {
            $gt: seasonData.beginDate
          }
        }
      },
      {
        $project: {
          companyId: 1,
          dealAmount: '$amount',
          dealMoney: {
            $multiply: ['$amount', '$price']
          }
        }
      },
      {
        $group: {
          _id: '$companyId',
          totalDealAmount: {
            $sum: '$dealAmount'
          },
          totalDealMoney: {
            $sum: '$dealMoney'
          }
        }
      },
      {
        $lookup: {
          from: 'companies',
          localField: '_id',
          foreignField: '_id',
          as: 'companyData'
        }
      },
      {
        $project: {
          _id: 1,
          avgPrice: {
            $divide: ['$totalDealMoney', '$totalDealAmount']
          },
          isSeal: {
            $arrayElemAt: ['$companyData.isSeal', 0]
          },
          totalRelease: {
            $arrayElemAt: ['$companyData.totalRelease', 0]
          },
          profit: {
            $arrayElemAt: ['$companyData.profit', 0]
          }
        }
      },
      {
        $match: {
          isSeal: false,
          profit: {
            $gt: 0
          }
        }
      },
      {
        $project: {
          _id: 1,
          profit: 1,
          avgPrice: 1,
          totalRelease: 1,
          priceToEarn: {
            $divide: [
              {
                $multiply: [
                  {
                    $divide: [
                      '$profit',
                      '$totalRelease'
                    ]
                  },
                  0.8
                ]
              },
              '$avgPrice'
            ]
          }
        }
      },
      {
        $sort: {
          priceToEarn: -1,
          avgPrice: 1
        }
      },
      {
        $limit : 100
      }
    ]);

    const seasonId = seasonData._id;
    const rankCompanyPriceBulk = dbRankCompanyPrice.rawCollection().initializeUnorderedBulkOp();
    _.each(rankCompanyPriceList, (rankData) => {
      rankCompanyPriceBulk.insert({
        seasonId: seasonId,
        companyId: rankData._id,
        totalDealAmount: rankData.totalDealAmount,
        totalDealMoney: rankData.totalDealMoney,
        productProfit: rankData.productProfit
      });
    });
    rankCompanyPriceBulk.execute();

    const rankCompanyValueBulk = dbRankCompanyValue.rawCollection().initializeUnorderedBulkOp();
    _.each(rankCompanyValueList, (rankData) => {
      rankCompanyValueBulk.insert({
        seasonId: seasonId,
        companyId: rankData._id,
        lastPrice: rankData.lastPrice,
        totalRelease: rankData.totalRelease
      });
    });
    rankCompanyValueBulk.execute();

    const rankCompanyProfitBulk = dbRankCompanyProfit.rawCollection().initializeUnorderedBulkOp();
    _.each(rankCompanyProfitList, (rankData) => {
      rankCompanyProfitBulk.insert({
        seasonId: seasonId,
        companyId: rankData._id,
        profit: rankData.profit,
        totalRelease: rankData.totalRelease,
        avgPrice: Math.round(rankData.avgPrice * 100) / 100,
        priceToEarn: Math.round(rankData.priceToEarn * 1000) / 1000
      });
    });
    rankCompanyProfitBulk.execute();
  }
}

function generateHasStockUserWealthList() {
  return dbDirectors.aggregate([
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
        },
        noLoginDayCount:  {
          $arrayElemAt: ['$userData.profile.noLoginDayCount', 0]
        },
        lastLoginDate:  {
          $arrayElemAt: ['$userData.status.lastLogin.date', 0]
        }
      }
    },
    {
      $project: {
        _id: 1,
        stocksValue: 1,
        money: 1,
        noLoginDayCount: 1,
        lastLoginDate: 1,
        totalWealth: {
          $add: ['$money', '$stocksValue']
        }
      }
    },
    {
      $sort: {
        totalWealth: -1
      }
    }
  ]);
}

function rankHasStockUser(hasStockUserWealthList, seasonData) {
  const rankUserBulk = dbRankUserWealth.rawCollection().initializeUnorderedBulkOp();
  _.each(hasStockUserWealthList, (rankData) => {
    rankUserBulk.insert({
      seasonId: seasonData._id,
      userId: rankData._id,
      money: rankData.money,
      stocksValue: rankData.stocksValue
    });
  });
  rankUserBulk.execute();
}

function generateNoStockUserWealthList() {
  return Meteor.users.aggregate([
    {
      $project: {
        userId: 1,
        totalWealth: '$profile.money',
        noLoginDayCount: '$profile.noLoginDayCount',
        lastLoginDate: '$status.lastLogin.date'
      }
    },
    {
      $lookup: {
        from: 'directors',
        localField: '_id',
        foreignField: 'userId',
        as: 'directorsData'
      }
    },
    {
      $unwind: {
          path: '$directorsData',
          preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: {
        directorsData: {
          $exists: false
        }
      }
    }
  ]);
}

const taxConfigList = [
  {
    from: 10000,
    to: 100000,
    ratio: 3,
    balance: 300
  },
  {
    from: 100000,
    to: 500000,
    ratio: 6,
    balance: 3300
  },
  {
    from: 500000,
    to: 1000000,
    ratio: 9,
    balance: 18300
  },
  {
    from: 1000000,
    to: 2000000,
    ratio: 12,
    balance: 48300
  },
  {
    from: 2000000,
    to: 3000000,
    ratio: 15,
    balance: 108300
  },
  {
    from: 3000000,
    to: 4000000,
    ratio: 18,
    balance: 198300
  },
  {
    from: 4000000,
    to: 5000000,
    ratio: 21,
    balance: 318300
  },
  {
    from: 5000000,
    to: 6000000,
    ratio: 24,
    balance: 468300
  },
  {
    from: 6000000,
    to: 7000000,
    ratio: 27,
    balance: 648300
  },
  {
    from: 7000000,
    to: 8000000,
    ratio: 30,
    balance: 858300
  },
  {
    from: 8000000,
    to: 9000000,
    ratio: 33,
    balance: 1098300
  },
  {
    from: 9000000,
    to: 10000000,
    ratio: 36,
    balance: 1368300
  },
  {
    from: 10000000,
    to: 11000000,
    ratio: 39,
    balance: 1668300
  },
  {
    from: 11000000,
    to: 12000000,
    ratio: 42,
    balance: 1998300
  },
  {
    from: 12000000,
    to: 13000000,
    ratio: 45,
    balance: 2358300
  },
  {
    from: 13000000,
    to: 14000000,
    ratio: 48,
    balance: 2748300
  },
  {
    from: 14000000,
    to: 15000000,
    ratio: 51,
    balance: 3168300
  },
  {
    from: 15000000,
    to: 16000000,
    ratio: 54,
    balance: 3618300
  },
  {
    from: 16000000,
    to: 17000000,
    ratio: 57,
    balance: 4098300
  },
  {
    from: 17000000,
    to: Infinity,
    ratio: 60,
    balance: 4608300
  }
];

function generateUserTaxes(userWealthList) {
  const createdAt = new Date();
  const expireDate = new Date(new Date().setHours(0, 0, 0, 0) + 259200000);
  const taxesBulk = dbTaxes.rawCollection().initializeUnorderedBulkOp();
  const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
  _.each(userWealthList, (wealthData) => {
    const noLoginDay = Math.floor((createdAt.getTime() - (wealthData.lastLoginDate ? wealthData.lastLoginDate.getTime() : 0)) / 86400000);
    const noLoginDayCount = Math.min(noLoginDay + (wealthData.noLoginDayCount || 0), Math.floor(config.seasonTime / 86400000));
    const zombie = noLoginDayCount * config.salaryPerPay;
    const matchTaxConfig = _.find(taxConfigList, (taxConfig) => {
      return (
        wealthData.totalWealth >= taxConfig.from &&
        wealthData.totalWealth < taxConfig.to
      );
    });
    if (matchTaxConfig) {
      const tax = Math.ceil(wealthData.totalWealth * matchTaxConfig.ratio / 100) - matchTaxConfig.balance;
      if (tax > 0) {
        taxesBulk.insert({
          userId: wealthData._id,
          tax: tax,
          zombie: zombie,
          fine: 0,
          paid: 0,
          expireDate: expireDate
        });
        logBulk.insert({
          logType: '季度賦稅',
          userId: [wealthData._id],
          amount: tax,
          price: zombie,
          createdAt: createdAt
        });
      }
    }
    else if (zombie > 0) {
      taxesBulk.insert({
        userId: wealthData._id,
        tax: 0,
        zombie: zombie,
        fine: 0,
        paid: 0,
        expireDate: expireDate
      });
      logBulk.insert({
        logType: '季度賦稅',
        userId: [wealthData._id],
        amount: 0,
        price: zombie,
        createdAt: createdAt
      });
    }
  });
  taxesBulk.execute();
  logBulk.execute();
}
