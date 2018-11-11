import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { dbLog } from '/db/dbLog';
import { dbVoteRecord } from '/db/dbVoteRecord';
import { getCurrentSeason, getInitialVoteTicketCount } from '/db/dbSeason';

// 發放產品推薦回饋金給有投票的使用者
export function deliverProductVotingRewards() {
  deliverSystemProductVotingRewards();
}

// 發放系統提供的推薦票回饋金
function deliverSystemProductVotingRewards() {
  const { systemProductVotingReward } = Meteor.settings.public;
  const initialVoteTicketCount = getInitialVoteTicketCount(getCurrentSeason());
  const userRewardMap = {};
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

  Object.entries(userVoteTicketMap).forEach(([userId, count]) => {
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
