import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { dbCompanies } from '/db/dbCompanies';
import { dbEmployees } from '/db/dbEmployees';
import { dbDirectors } from '/db/dbDirectors';
import { dbLog } from '/db/dbLog';
import { dbVips } from '/db/dbVips';
import { dbVoteRecord } from '/db/dbVoteRecord';

// 對所有公司進行營利結算與分配
export function summarizeAndDistributeProfits() {
  const profitSummaryMap = {};
  const bonusMap = {};
  const capitalIncreaseMap = {};

  dbCompanies.find({ isSeal: false, profit: { $gt: 0 } }).forEach((companyData) => {
    const { _id: companyId, profit } = companyData;

    const totalProfit = Math.round(profit);
    profitSummaryMap[companyId] = totalProfit;
    let remainingProfit = totalProfit;

    // 計算公司所得稅
    const incomeTax = computeCompanyIncomeTax(companyData, remainingProfit);
    remainingProfit -= incomeTax;

    // 計算公司資本額注入量
    const capitalIncrease = computeCompanyCapitalIncrease(companyData, remainingProfit);
    remainingProfit -= capitalIncrease;
    if (capitalIncrease > 0) {
      capitalIncreaseMap[companyId] = capitalIncrease;
    }

    const companyBonusMap = {};

    // 計算經理分紅
    const managerBonusMap = computeManagerBonusMap(companyData, remainingProfit);
    remainingProfit -= Object.values(managerBonusMap).reduce(add, 0);
    if (! _.isEmpty(managerBonusMap)) {
      companyBonusMap.managerBonus = managerBonusMap;
    }

    // 計算員工分紅
    const employeeBonusMap = computeEmployeeBonusMap(companyData, remainingProfit);
    remainingProfit -= Object.values(employeeBonusMap).reduce(add, 0);
    if (! _.isEmpty(employeeBonusMap)) {
      companyBonusMap.employeeBonus = employeeBonusMap;
    }

    // 計算員工投票獎金
    const employeeProductVotingRewardMap = computeEmployeeProductVotingRewardMap(companyData, remainingProfit);
    remainingProfit -= Object.values(employeeProductVotingRewardMap).reduce(add, 0);
    if (! _.isEmpty(employeeProductVotingRewardMap)) {
      companyBonusMap.employeeProductVotingReward = employeeProductVotingRewardMap;
    }

    // 計算股東分紅（將分配完所有剩下的營利）
    const directorBonusMap = computeDirectorBonusMap(companyData, remainingProfit);
    if (! _.isEmpty(directorBonusMap)) {
      companyBonusMap.directorBonus = directorBonusMap;
    }

    if (! _.isEmpty(companyBonusMap)) {
      bonusMap[companyId] = companyBonusMap;
    }
  });

  const baseLogTime = Date.now();
  let logTimeOffset = 0;

  // 執行寫入公司營利紀錄
  if (! _.isEmpty(profitSummaryMap)) {
    const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
    const logSchema = dbLog.simpleSchema();

    Object.entries(profitSummaryMap).forEach(([companyId, profit]) => {
      const logData = logSchema.clean({
        logType: '公司營利',
        companyId,
        data: { profit },
        createdAt: baseLogTime + logTimeOffset
      });
      logSchema.validate(logData);
      logBulk.insert(logData);
    });

    logTimeOffset += 1;
    Meteor.wrapAsync(logBulk.execute, logBulk)();
  }

  // 執行營利注入資本額
  if (! _.isEmpty(capitalIncreaseMap)) {
    const companyBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
    const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
    const logSchema = dbLog.simpleSchema();

    Object.entries(capitalIncreaseMap).forEach(([companyId, capitalIncrease]) => {
      companyBulk.find({ _id: companyId }).updateOne({ $inc: { capital: capitalIncrease } });

      const logData = logSchema.clean({
        logType: '營利分紅',
        companyId,
        data: {
          bonusType: 'capitalIncrease',
          amount: capitalIncrease
        },
        createdAt: baseLogTime + logTimeOffset
      });
      logSchema.validate(logData);
      logBulk.insert(logData);
    });

    logTimeOffset += 1;
    Meteor.wrapAsync(companyBulk.execute, companyBulk)();
    Meteor.wrapAsync(logBulk.execute, logBulk)();
  }

  // 執行分紅與獎金發放
  if (! _.isEmpty(bonusMap)) {
    const userBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();
    const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
    const logSchema = dbLog.simpleSchema();

    Object.entries(bonusMap).forEach(([companyId, companyBonusMap]) => {
      Object.entries(companyBonusMap).forEach(([bonusType, userBonusMap]) => {
        Object.entries(userBonusMap).forEach(([userId, amount]) => {
          userBulk.find({ _id: userId }).updateOne({ $inc: { 'profile.money': amount } });

          const logData = logSchema.clean({
            logType: '營利分紅',
            userId: [userId],
            companyId,
            data: { bonusType, amount },
            createdAt: baseLogTime + logTimeOffset
          });
          logSchema.validate(logData);
          logBulk.insert(logData);
        });
      });
    });

    logTimeOffset += 1;
    Meteor.wrapAsync(userBulk.execute, userBulk)();
    Meteor.wrapAsync(logBulk.execute, logBulk)();
  }
}

function add(a, b) {
  return a + b;
}

// 計算公司所得稅
function computeCompanyIncomeTax({ profit }, remainingProfit) {
  return Math.min(Math.ceil(profit * Meteor.settings.public.companyProfitDistribution.incomeTaxRatePercent / 100), remainingProfit);
}

// 計算公司資本額注入量
function computeCompanyCapitalIncrease({ profit, capitalIncreaseRatePercent }, remainingProfit) {
  return Math.min(Math.ceil(profit * capitalIncreaseRatePercent / 100), remainingProfit);
}

// 判定使用者是否能領取分紅
function canUserReceiveBonus(userData) {
  const { seasonTime } = Meteor.settings.public;
  const sevenDaysMs = 604800000;

  // 非當季開始放假者不分紅
  if (userData.profile.isInVacation && Date.now() - userData.profile.lastVacationStartDate.getTime() > seasonTime) {
    return false;
  }

  // 被禁止交易者不分紅
  if (_.contains(userData.profile.ban, 'deal')) {
    return false;
  }

  // 七天未動作者不分紅
  if (Date.now() - userData.status.lastLogin.date.getTime() > sevenDaysMs) {
    return false;
  }

  return true;
}

// 計算經理人分紅
function computeManagerBonusMap({ manager, managerBonusRatePercent, profit }, remainingProfit) {
  if (! manager || manager === '!none') {
    return {};
  }

  const managerData = Meteor.users.findOne(manager, {
    fields: {
      'profile.ban': 1,
      'profile.isInVacation': 1,
      'profile.lastVacationStartDate': 1,
      'status.lastLogin.date': 1
    }
  });

  if (! canUserReceiveBonus(managerData)) {
    return {};
  }

  const bonus = Math.min(Math.ceil(profit * managerBonusRatePercent / 100), remainingProfit);

  return bonus <= 0 ? {} : { [manager]: bonus };
}

// 計算員工分紅
function computeEmployeeBonusMap({ _id: companyId, profit, employeeBonusRatePercent }, remainingProfit) {
  const employeeUserIds = _.pluck(dbEmployees.find({ companyId, employed: true }, {
    fields: { userId: 1 },
    sort: { registerAt: 1 }
  }).fetch(), 'userId');

  const canReceiveBonusUsers = Meteor.users
    .find({ _id: { $in: employeeUserIds } }, {
      fields: {
        'profile.ban': 1,
        'profile.isInVacation': 1,
        'profile.lastVacationStartDate': 1,
        'status.lastLogin.date': 1
      }
    })
    .fetch()
    .filter(canUserReceiveBonus);
  const canReceiveBonusUserIds = _.pluck(canReceiveBonusUsers, '_id');
  const canReceiveBonusUserCount = canReceiveBonusUsers.length;

  // 員工分紅總額
  const totalBonus = Math.min(Math.ceil(profit * employeeBonusRatePercent / 100), remainingProfit);

  // 每位員工的分紅，無條件捨去以確保每位員工能拿到相同分紅且不超出總額
  const bonusPerEmployee = Math.floor(totalBonus / canReceiveBonusUserCount);

  if (bonusPerEmployee <= 0) {
    return {};
  }

  return canReceiveBonusUserIds.reduce((obj, userId) => {
    obj[userId] = bonusPerEmployee;

    return obj;
  }, {});
}

// 計算員工投票獎金
function computeEmployeeProductVotingRewardMap({ _id: companyId, profit }, remainingProfit) {
  const { employeeProductVotingRewardRatePercent } = Meteor.settings.public.companyProfitDistribution;

  const employeeUserIds = _.pluck(dbEmployees.find({ companyId, employed: true }, { fields: { userId: 1 } }).fetch(), 'userId');

  const canReceiveBonusUsers = Meteor.users
    .find({ _id: { $in: employeeUserIds } }, {
      fields: {
        'profile.ban': 1,
        'profile.isInVacation': 1,
        'profile.lastVacationStartDate': 1,
        'status.lastLogin.date': 1
      }
    })
    .fetch()
    .filter(canUserReceiveBonus);
  const canReceiveBonusUserIds = _.pluck(canReceiveBonusUsers, '_id');

  const voteTicketMap = dbVoteRecord
    .aggregate([ {
      $match: { userId: { $in: canReceiveBonusUserIds } }
    }, {
      $group: {
        _id: '$userId',
        count: { $sum: 1 }
      }
    } ])
    .reduce((obj, { _id, count }) => {
      obj[_id] = count;

      return obj;
    }, {});

  const totalVoteTickets = Object.values(voteTicketMap).reduce(add, 0);

  // 獎金總額
  const totalReward = Math.min(Math.ceil(profit * employeeProductVotingRewardRatePercent / 100), remainingProfit);

  return canReceiveBonusUserIds.reduce((obj, userId) => {
    // 該員工得到的獎金，無條件捨去以確保投了相同票數的員工能拿到相同獎金且獎金合計不超過總額
    const userReward = Math.floor(totalReward * voteTicketMap[userId] / totalVoteTickets);

    if (userReward > 0) {
      obj[userId] = userReward;
    }

    return obj;
  }, {});
}

// 計算股東分紅
function computeDirectorBonusMap({ _id: companyId }, totalBonus) {
  const effectiveStocksMap = {};

  dbDirectors
    .find({
      companyId,
      userId: { $nin: ['!system', '!FSC'] } // 系統及金管會不分紅
    }, {
      sort: { stocks: -1, createdAt: 1 }, // 以持股數多至少、成為股東時間先到後的順序分紅
      fields: { userId: 1, stocks: 1 }
    })
    .fetch()
    .forEach(({ userId, stocks }) => {
      const userData = Meteor.users.findOne(userId, {
        fields: {
          'profile.ban': 1,
          'profile.noLoginDayCount': 1,
          'profile.isInVacation': 1,
          'profile.lastVacationStartDate': 1,
          'status.lastLogin.date': 1
        }
      });

      if (! canUserReceiveBonus(userData)) {
        return;
      }

      // 計算未登入天數影響的分紅
      const noLoginDayBonusFactor = computeUserNoLoginDayBonusFactor(userData);

      // VIP 分紅加成
      const { level: vipLevel = 0 } = dbVips.findOne({ userId, companyId }, { fields: { level: 1 } }) || {};
      const { stockBonusFactor: vipBonusFactor } = Meteor.settings.public.vipParameters[vipLevel];

      // 根據各項加成計算有效持股數
      const effectiveStocksFactor = noLoginDayBonusFactor * vipBonusFactor;
      const effectiveStocks = effectiveStocksFactor * stocks;

      if (effectiveStocks > 0) {
        effectiveStocksMap[userId] = effectiveStocks;
      }
    });

  const totalEffectiveStocks = Object.values(effectiveStocksMap).reduce(add, 0);

  let remainingBonus = totalBonus;

  return Object.entries(effectiveStocksMap).reduce((obj, [userId, effectiveStocks]) => {
    // 該股東的分紅，無條件進位以確保能分完所有營利，但最後一位股東將得到較少分紅
    const directorBonus = Math.min(Math.ceil(totalBonus * effectiveStocks / totalEffectiveStocks), remainingBonus);

    if (directorBonus > 0 && remainingBonus >= directorBonus) {
      obj[userId] = directorBonus;
      remainingBonus -= directorBonus;
    }

    return obj;
  }, {});
}

// 計算未登入天數影響的分紅
function computeUserNoLoginDayBonusFactor({ status, profile }) {
  const { seasonTime } = Meteor.settings.public;
  const lastLoginDate = status.lastLogin.date;

  const oneDayMs = 86400000;
  const noLoginTime = Date.now() - lastLoginDate.getTime();
  const noLoginDay = Math.min(Math.floor(noLoginTime / oneDayMs), 7);
  const noLoginDayCount = Math.min(noLoginDay + (profile.noLoginDayCount || 0), Math.floor(seasonTime / oneDayMs));

  // 未上線天數 >= 5 者，持有股份以 0% 計
  if (noLoginDayCount >= 5) {
    return 0;
  }

  // 未上線天數 4 天者，持有股份以 50% 計，其餘則以 100% 計
  return noLoginDayCount === 4 ? 0.5 : 1;
}
