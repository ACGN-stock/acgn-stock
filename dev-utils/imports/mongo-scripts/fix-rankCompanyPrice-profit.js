// 更新所有賽季的股票熱門排行榜資訊，補上因新制產品計算上缺失，而缺少的產品營利資訊

const seasonData = db.season.find({}).sort({ beginData: 1 }).toArray();
seasonData.pop();

seasonData.forEach(({ _id: seasonId, beginDate, endDate }) => {
  db.rankCompanyPrice.remove({ seasonId });

  const productProfitMap = {};

  db.products.aggregate([
    {
      $match: {
        seasonId: seasonId
      }
    },
    {
      $group: {
        _id: '$companyId',
        totalProfit: {
          $sum: '$profit'
        }
      }
    }
  ]).forEach((profitData) => {
    const { _id: companyId, totalProfit } = profitData;

    productProfitMap[companyId] = totalProfit;
  });

  const rankCompanyPriceList = [];
  db.log.aggregate([
    {
      $match: {
        logType: '交易紀錄',
        createdAt: {
          $gt: beginDate,
          $lte: endDate
        }
      }
    },
    {
      $project: {
        companyId: 1,
        dealAmount: '$data.amount',
        dealMoney: {
          $multiply: ['$data.amount', '$data.price']
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
    }
  ]).forEach((dealData) => {
    const companyId = dealData._id;

    dealData.productProfit = productProfitMap[companyId] || 0;
    dealData.totalMoney = dealData.productProfit + dealData.totalDealMoney;

    rankCompanyPriceList.push(dealData);
  });

  rankCompanyPriceList.sort((prev, next) => {
    if (next.totalMoney > prev.totalMoney) {
      return 1;
    }
    else if (next.totalMoney === prev.totalMoney) {
      if (next.productProfit > prev.productProfit) {
        return 1;
      }
      else if (next.productProfit === prev.productProfit) {
        return 0;
      }
      else {
        return -1;
      }
    }
    else {
      return -1;
    }
  }).splice(100);

  if (rankCompanyPriceList.length > 0) {
    const rankCompanyPriceBulk = db.rankCompanyPrice.initializeUnorderedBulkOp();

    rankCompanyPriceList.forEach((rankData) => {
      rankCompanyPriceBulk.insert({
        seasonId: seasonId,
        companyId: rankData._id,
        totalDealAmount: rankData.totalDealAmount,
        totalDealMoney: rankData.totalDealMoney,
        productProfit: rankData.productProfit
      });
    });

    print(rankCompanyPriceBulk.execute());
  }
});
