import { dbOrders } from '/db/dbOrders';
import { dbLog } from '/db/dbLog';
import { getPriceLimits } from '/db/dbCompanies';

// 統計一段時間之內的交易數量
export function calculateDealAmount(companyData, lookBackTime) {
  const checkLogTime = new Date(Date.now() - lookBackTime);

  const data = dbLog.aggregate([ {
    $match: {
      logType: '交易紀錄',
      companyId: companyData._id,
      createdAt: { $gte: checkLogTime }
    }
  }, {
    $group: {
      _id: null,
      amount: { $sum: '$data.amount' }
    }
  } ])[0];

  return data ? data.amount : 0;
}

// 統計目前的所有高價（>= 漲停價）的買單數量加總
export function calculateHighPriceBuyAmount(companyData) {
  const data = dbOrders.aggregate([ {
    $match: {
      orderType: '購入',
      companyId: companyData._id,
      unitPrice: { $gte: getPriceLimits(companyData).upper }
    }
  }, {
    $group: {
      _id: null,
      amount: { $sum: '$amount' },
      done: { $sum: '$done' }
    }
  }, {
    $project: {
      amount: { $subtract: ['$amount', '$done'] }
    }
  } ])[0];

  return data ? data.amount : 0;
}
