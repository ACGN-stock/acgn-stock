import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { dbEmployees } from '/db/dbEmployees';
import { dbLog } from '/db/dbLog';
import { dbVoteRecord } from '/db/dbVoteRecord';
import { getCurrentSeason, getInitialVoteTicketCount } from '/db/dbSeason';

// 發放產品推薦回饋金給使用者
export function deliverProductVotingRewards() {
  const userVoteTicketMap = dbVoteRecord
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

  if (_.isEmpty(userVoteTicketMap)) {
    return;
  }

  const initialVoteTicketCount = getInitialVoteTicketCount(getCurrentSeason());

  const { systemProductVotingReward, employeeProductVotingRewardFactor } = Meteor.settings.public;

  const userRewardMap = {};

  // 計算系統回饋金
  Object.entries(userVoteTicketMap).forEach(([userId, count]) => {
    const totalReward = systemProductVotingReward;
    userRewardMap[userId] =
      count >= initialVoteTicketCount ? totalReward : Math.ceil(totalReward * count / 100);
  });

  // 計算擔任員工時的額外回饋金
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
        as: 'companyData' }
    }, {
      $unwind: '$companyData'
    }, {
      $project: {
        userId: 1,
        totalEmployeeBonus: {
          $ceil: { $multiply: ['$companyData.profit', '$companyData.seasonalBonusPercent', 0.01] }
        }
      }
    } ])
    .forEach(({ userId, totalEmployeeBonus }) => {
      const totalReward = Math.ceil(totalEmployeeBonus * employeeProductVotingRewardFactor);
      const count = userVoteTicketMap[userId];
      userRewardMap[userId] += Math.ceil(totalReward * count / 100);
    });

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
