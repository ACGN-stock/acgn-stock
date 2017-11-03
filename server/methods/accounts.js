'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check, Match } from 'meteor/check';
import { resourceManager } from '../resourceManager';
import { dbCompanies } from '../../db/dbCompanies';
import { dbDirectors } from '../../db/dbDirectors';
import { dbEmployees } from '../../db/dbEmployees';
import { dbLog, accuseLogTypeList } from '../../db/dbLog';
import { dbTaxes } from '../../db/dbTaxes';
import { dbVariables } from '../../db/dbVariables';
import { limitSubscription } from './rateLimit';
import { debug } from '../debug';
import { config } from '../../config.js';

Meteor.methods({
  payTax(taxId, amount) {
    check(this.userId, String);
    check(taxId, Mongo.ObjectID);
    check(amount, Match.Integer);
    payTax(Meteor.user(), taxId, amount);

    return true;
  }
});
function payTax(user, taxId, amount) {
  debug.log('payTax', {user, taxId, amount});
  if (amount < 1) {
    throw new Meteor.Error(403, '繳納稅金數量錯誤！');
  }
  if (user.profile.money < amount) {
    throw new Meteor.Error(403, '剩餘金錢不足，無法繳納稅金！');
  }
  const taxData = dbTaxes.findOne(taxId);
  if (! taxData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + taxId + '」的稅金資料！');
  }
  const totalNeedPay = taxData.tax + taxData.zombie + taxData.fine - taxData.paid;
  if (amount > totalNeedPay) {
    throw new Meteor.Error(403, '繳納金額與應納金額不相符！');
  }
  const userId = user._id;
  resourceManager.throwErrorIsResourceIsLock(['user' + userId]);
  //先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('payTax', ['user' + userId], (release) => {
    const user = Meteor.users.findOne(userId, {
      fields: {
        profile: 1
      }
    });
    if (user.profile.money < amount) {
      throw new Meteor.Error(403, '剩餘金錢不足，無法繳納稅金！');
    }
    const taxData = dbTaxes.findOne(taxId);
    if (! taxData) {
      throw new Meteor.Error(404, '找不到識別碼為「' + taxId + '」的稅金資料！');
    }
    const totalNeedPay = taxData.tax + taxData.zombie + taxData.fine - taxData.paid;
    if (amount > totalNeedPay) {
      throw new Meteor.Error(403, '繳納金額與應納金額不相符！');
    }
    const createdAt = new Date();
    //若在上次發薪後的繳稅紀錄，則併為同一筆紀錄
    const existsLogData = dbLog.findOne({
      userId: userId,
      createdAt: {
        $gt: new Date(dbVariables.get('lastPayTime').getTime())
      },
      logType: '繳納稅金'
    })
    if (existsLogData) {
      dbLog.update(existsLogData._id, {
        $set: {
          createdAt: createdAt
        },
        $inc: {
          amount: amount
        }
      });
    }
    else {
      dbLog.insert({
        logType: '繳納稅金',
        userId: [userId],
        amount: amount,
        createdAt: createdAt
      });
    }
    if (amount === totalNeedPay) {
      dbTaxes.remove(taxId);
    }
    else {
      dbTaxes.update(taxId, {
        $inc: {
          paid: amount
        }
      });
    }
    const expiredTaxesCount = dbTaxes
      .find({
        userId: userId,
        expireDate: {
          $lte: new Date()
        }
      })
      .count();
    //如果還有逾期未繳的稅單，扣錢就好
    if (expiredTaxesCount > 0) {
      Meteor.users.update(userId, {
        $inc: {
          'profile.money': amount * -1
        }
      });
    }
    //所有逾期未繳的稅單都繳納完畢後，取消繳稅逾期狀態
    else {
      Meteor.users.update(userId, {
        $inc: {
          'profile.money': amount * -1
        },
        $set: {
          'profile.notPayTax': false
        }
      });
    }
    release();
  });
}

Meteor.publish('accountInfo', function(userId) {
  debug.log('publish accountInfo', userId);
  check(userId, String);

  return [
    Meteor.users.find(userId, {
      fields: {
        'services.google.email': 1,
        'status.lastLogin.date': 1,
        'status.lastLogin.ipAddr': 1,
        username: 1,
        profile: 1,
        createdAt: 1
      }
    }),
    dbCompanies
      .find(
        {
          manager: userId,
          isSeal: false
        },
        {
          fields: {
            companyName: 1,
            manager: 1
          },
          disableOplog: true
        }
      )
  ];
});
//一分鐘最多20次
limitSubscription('accountInfo');

Meteor.publish('accountInfoTax', function(userId, offset) {
  debug.log('publish accountInfoTax', {userId, offset});
  check(userId, String);
  check(offset, Match.Integer);

  let initialized = false;
  let total = dbTaxes.find({userId}).count();
  this.added('variables', 'totalCountOfAccountInfoTax', {
    value: total
  });

  const observer = dbTaxes
    .find({userId}, {
      skip: offset,
      limit: 10,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('taxes', id, fields);
        if (initialized) {
          total += 1;
          this.changed('variables', 'totalCountOfAccountInfoTax', {
            value: total
          });
        }
      },
      changed: (id, fields) => {
        this.changed('taxes', id, fields);
      },
      removed: (id) => {
        this.removed('taxes', id);
        if (initialized) {
          total -= 1;
          this.changed('variables', 'totalCountOfAccountInfoTax', {
            value: total
          });
        }
      }
    });
  initialized = true;
  this.ready();
  this.onStop(() => {
    observer.stop();
  });
});
//一分鐘最多20次
limitSubscription('accountInfoTax');

Meteor.publish('accountOwnStocks', function(userId, offset) {
  debug.log('publish accountOwnStocks', {userId, offset});
  check(userId, String);
  check(offset, Match.Integer);

  let initialized = false;
  let total = dbDirectors.find({userId}).count();
  this.added('variables', 'totalCountOfAccountOwnStocks', {
    value: total
  });

  const observer = dbDirectors
    .find({userId}, {
      fields: {
        userId: 1,
        companyId: 1,
        stocks: 1
      },
      skip: offset,
      limit: 10,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('directors', id, fields);
        if (initialized) {
          total += 1;
          this.changed('variables', 'totalCountOfAccountOwnStocks', {
            value: total
          });
        }
      },
      changed: (id, fields) => {
        this.changed('directors', id, fields);
      },
      removed: (id) => {
        this.removed('directors', id);
        if (initialized) {
          total -= 1;
          this.changed('variables', 'totalCountOfAccountOwnStocks', {
            value: total
          });
        }
      }
    });
  initialized = true;
  this.ready();
  this.onStop(() => {
    observer.stop();
  });
});
//一分鐘最多20次
limitSubscription('accountOwnStocks');

Meteor.publish('accountAccuseLog', function(userId, offset) {
  debug.log('publish accountAccuseLog', {userId, offset});
  check(userId, String);
  check(offset, Match.Integer);

  let initialized = false;
  let total = dbLog
    .find(
      {
        userId: userId,
        logType: {
          $in: accuseLogTypeList
        }
      }
    )
    .count();
  this.added('variables', 'totalCountOfAccountAccuseLog', {
    value: total
  });

  const observer = dbLog
    .find(
      {
        userId: userId,
        logType: {
          $in: accuseLogTypeList
        }
      },
      {
        sort: {
          createdAt: -1
        },
        skip: offset,
        limit: 10,
        disableOplog: true
      }
    )
    .observeChanges({
      added: (id, fields) => {
        this.added('log', id, fields);
        if (initialized) {
          total += 1;
          this.changed('variables', 'totalCountOfAccountAccuseLog', {
            value: total
          });
        }
      },
      removed: (id) => {
        this.removed('log', id);
        if (initialized) {
          total -= 1;
          this.changed('variables', 'totalCountOfAccountInfoLog', {
            value: total
          });
        }
      }
    });
  initialized = true;
  this.ready();
  this.onStop(() => {
    observer.stop();
  });
});
//一分鐘最多20次
limitSubscription('accountInfoLog');

Meteor.publish('accountInfoLog', function(userId, offset) {
  debug.log('publish accountInfoLog', {userId, offset});
  check(userId, String);
  check(offset, Match.Integer);

  const firstLogData = dbLog.findOne({userId}, {
    sort: {
      createdAt: 1
    } 
  });
  const firstLogDate = firstLogData ? firstLogData.createdAt : new Date();

  let initialized = false;
  let total = dbLog
    .find(
      {
        userId: {
          $in: [userId, '!all']
        },
        createdAt: {
          $gte: firstLogDate
        }
      }
    )
    .count();
  this.added('variables', 'totalCountOfAccountInfoLog', {
    value: total
  });

  const observer = dbLog
    .find(
      {
        userId: {
          $in: [userId, '!all']
        },
        createdAt: {
          $gte: firstLogDate
        }
      },
      {
        sort: {
          createdAt: -1
        },
        skip: offset,
        limit: 30,
        disableOplog: true
      }
    )
    .observeChanges({
      added: (id, fields) => {
        this.added('log', id, fields);
        if (initialized) {
          total += 1;
          this.changed('variables', 'totalCountOfAccountInfoLog', {
            value: total
          });
        }
      },
      removed: (id) => {
        this.removed('log', id);
        if (initialized) {
          total -= 1;
          this.changed('variables', 'totalCountOfAccountInfoLog', {
            value: total
          });
        }
      }
    });
  initialized = true;
  this.ready();
  this.onStop(() => {
    observer.stop();
  });
});
//一分鐘最多20次
limitSubscription('accountInfoLog');

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

Meteor.publish('accountValueInfo', function(userId) {
  debug.log('publish accountValueInfo', {userId});
  check(userId, String);

  const ownStocks = dbDirectors.find({userId}).fetch();
  const stockMap = {};
  ownStocks.forEach((o) => { stockMap[o.companyId] = o.stocks; });

  let companyIdList = Object.keys(stockMap);

  let employeedCompanyId = undefined;
  const employeedInfo = dbEmployees.findOne({'userId': userId, 'employed': true});
  if (employeedInfo && !companyIdList.includes(employeedInfo.companyId)) {
    employeedCompanyId = employeedInfo.companyId;
    companyIdList.push(employeedInfo.companyId);
  }

  // 取得含有股份、擔任經理人或員工就職的公司資料
  const companyData = dbCompanies.find({
    '$or': [
      { 
        '_id': {'$in': companyIdList},
        'isSeal': false,
      },
      {
        'manager': userId,
        'isSeal': false,
      }
    ]
  }).fetch();

  companyIdList = companyData.map(o => o._id);
  const managerCompanyIds = companyData.filter(o => (o.manager === userId)).map(o => o._id);

  // 取得含有股份或員工就職的公司現任員工資訊
  const employeeData = dbEmployees.find({
    'companyId': {'$in': companyIdList},
    'employed': true,
  }).fetch();

  const employeeMap = {};
  employeeData.forEach((o) => {
    let companyId = o.companyId;

    employeeMap[companyId] = (employeeMap[companyId]) ? (employeeMap + 1) : 0;
  });

  const companyMap = {};
  companyData.forEach((o) => {
    let companyId = o._id;
    let netProfitRate = 1 - config.costFromProfit;

    netProfitRate -= (o.managerId) ? config.managerProfitPercent : 0;
    netProfitRate -= (employeeMap[companyId]) ? (o.seasonalBonusPercent / 100) : 0;

    let earnPerShare = o.profit * netProfitRate / o.totalRelease;

    companyMap[companyId] = {
      totalRelase: o.totalRelase,
      listPrice: o.listPrice,
      profit: o.profit,
      earnPerShare: earnPerShare,
    };
  });

  let stockTotalValue = 0; // 股票總值
  let stockTotalProfit = 0; // 股票分紅
  let managerProfit = 0; // 經理薪水
  let employedProfit = 0; // 員工薪水
  let money = Meteor.users.findOne(userId).profile.money;

  companyIdList.forEach((companyId) => {
    let data = companyMap[companyId];

    stockTotalValue += (stockMap[companyId]) ? (data.listPrice * stockMap[companyId]) : 0;
    stockTotalProfit += (stockMap[companyId]) ? Math.ceil(data.earnPerShare * stockMap[companyId]) : 0;
    managerProfit += (managerCompanyIds.includes(companyId)) ? Math.ceil(data.profit * config.managerProfitPercent) : 0;
    employedProfit += (employeedCompanyId == companyId) ?
      Math.ceil(data.profit * data.seasonalBonusPercent / employeeMap[companyId]) : 0;
  });

  let totalWealth = stockTotalValue + stockTotalProfit + managerProfit + employedProfit + money;

  const matchTaxConfig = _.find(taxConfigList, (taxConfig) => {
    return (
      totalWealth >= taxConfig.from &&
      totalWealth < taxConfig.to
    );
  });

  const tax = (matchTaxConfig) ?
    (Math.ceil(totalWealth * matchTaxConfig.ratio / 100) - matchTaxConfig.balance) : 0;

  this.added('variables', 'stockTotalValue', {
    value: stockTotalValue,
  });
  this.added('variables', 'stockTotalProfit', {
    value: stockTotalProfit,
  });
  this.added('variables', 'managerProfit', {
    value: managerProfit,
  });
  this.added('variables', 'employedProfit', {
    value: employedProfit,
  });
  this.added('variables', 'tax', {
    value: tax,
  });

});
//一分鐘最多10次
limitSubscription('accountValueInfo', 10);