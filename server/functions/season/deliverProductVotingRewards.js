import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { dbCompanies } from '/db/dbCompanies';
import { dbEmployees } from '/db/dbEmployees';
import { dbLog } from '/db/dbLog';
import { dbVoteRecord } from '/db/dbVoteRecord';
import { getCurrentSeason, getInitialVoteTicketCount } from '/db/dbSeason';

// 發放產品推薦回饋金給有投票的使用者
export function deliverProductVotingRewards() {
  deliverSystemProductVotingRewards();
  deliverEmployeeProductVotingRewards();
}

// 發放系統提供的推薦票回饋金
function deliverSystemProductVotingRewards() {
  const { systemProductVotingReward } = Meteor.settings.public;
  const initialVoteTicketCount = getInitialVoteTicketCount(getCurrentSeason());
  const userRewardMap = {};

  Object.entries(getUserVoteTicketMap()).forEach(([userId, count]) => {
    const totalReward = systemProductVotingReward;
    userRewardMap[userId] =
      count >= initialVoteTicketCount ? totalReward : Math.ceil(totalReward * count / 100);
  });

  if (_.isEmpty(userRewardMap)) {
    return;
  }

  const userBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();
  const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
  const logSchema = dbLog.simpleSchema();

  const nowDate = new Date();

  Object.entries(userRewardMap).forEach(([userId, reward]) => {
    userBulk.find({ _id: userId }).updateOne({ $inc: { 'profile.money': reward } });
    const logData = logSchema.clean({
      logType: '推薦回饋',
      userId: [userId],
      data: { reward },
      createdAt: nowDate
    });
    logSchema.validate(logData);
    logBulk.insert(logData);
  });

  Meteor.wrapAsync(userBulk.execute).call(userBulk);
  Meteor.wrapAsync(logBulk.execute).call(logBulk);
}

// 發放公司員工的推薦票回饋金
function deliverEmployeeProductVotingRewards() {
  const { employeeProductVotingRewardFactor } = Meteor.settings.public;
  const userRewardMap = {};

  const userVoteTicketMap = getUserVoteTicketMap();
  const employeeCompanyMap = {};

  const companyProfitMap = dbCompanies
    .find({ isSeal: false }, { fields: { profit: 1 } })
    .fetch()
    .reduce((obj, { _id, profit }) => {
      obj[_id] = profit;

      return obj;
    }, {});

  dbEmployees
    .aggregate([ {
      $match: {
        userId: { $in: Object.keys(userVoteTicketMap) },
        employed: true
      }
    }, {
      $lookup: {
        from: 'companies',
        localField: 'companyId',
        foreignField: '_id',
        as: 'companyData'
      }
    }, {
      $unwind: '$companyData'
    }, {
      $match: {
        'companyData.isSeal': false,
        'companyData.profit': { $gt: 0 }
      }
    }, {
      $group: {
        _id: '$companyId',
        votedEmployeeUserIds: { $push: '$userId' }
      }
    } ])
    .forEach(({ _id: companyId, votedEmployeeUserIds }) => {
      const companyProfit = companyProfitMap[companyId];
      const totalEmployeeVoteTickets = votedEmployeeUserIds.reduce((sum, userId) => {
        return sum + userVoteTicketMap[userId] || 0;
      }, 0);
      const baseReward = employeeProductVotingRewardFactor * companyProfit;

      votedEmployeeUserIds.forEach((userId) => {
        employeeCompanyMap[userId] = companyId;

        const voteTickets = userVoteTicketMap[userId];
        userRewardMap[userId] = Math.ceil(baseReward * voteTickets / totalEmployeeVoteTickets);
      });
    });

  if (_.isEmpty(userRewardMap)) {
    return;
  }

  const userBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();
  const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
  const logSchema = dbLog.simpleSchema();

  const nowDate = new Date();

  Object.entries(userRewardMap).forEach(([userId, reward]) => {
    userBulk.find({ _id: userId }).updateOne({ $inc: { 'profile.money': reward } });
    const logData = logSchema.clean({
      logType: '推薦回饋',
      companyId: employeeCompanyMap[userId],
      userId: [userId],
      data: { reward },
      createdAt: nowDate
    });
    logSchema.validate(logData);
    logBulk.insert(logData);
  });

  Meteor.wrapAsync(userBulk.execute).call(userBulk);
  Meteor.wrapAsync(logBulk.execute).call(logBulk);
}

function getUserVoteTicketMap() {
  return dbVoteRecord
    .aggregate([ {
      $group: {
        _id: '$userId',
        count: { $sum: 1 }
      }
    } ])
    .reduce((obj, { _id, count }) => {
      obj[_id] = count;

      return obj;
    }, {});
}
