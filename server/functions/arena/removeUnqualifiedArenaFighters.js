import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';

import { dbArenaFighters } from '/db/dbArenaFighters';
import { dbLog } from '/db/dbLog';
import { getCurrentArena } from './getCurrentArena';

// 移除未達成報名門檻的參賽者
export function removeUnqualifiedArenaFighters() {
  const { _id: arenaId } = getCurrentArena();
  const { arenaMinInvestedAmount } = Meteor.settings.public;

  const removedArenaFighterIdList = [];
  const userRefundMap = {};
  const logDataList = [];

  dbArenaFighters
    .aggregate([ {
      $match: { arenaId }
    }, {
      $project: {
        companyId: 1,
        investors: 1,
        totalInvestedAmount: { $sum: '$investors.amount' }
      }
    }, {
      $match: {
        totalInvestedAmount: { $lt: arenaMinInvestedAmount }
      }
    } ])
    .forEach(({ _id: arenaFighterId, companyId, investors }) => {
      const logCreatedAt = new Date();

      logDataList.push({
        logType: '亂鬥失格',
        companyId,
        createdAt: logCreatedAt
      });
      removedArenaFighterIdList.push(arenaFighterId);

      _.each(investors, ({ userId, amount }, i) => {
        logDataList.push({
          logType: '亂鬥退款',
          companyId,
          userId: [userId],
          data: { refund: amount },
          createdAt: new Date(logCreatedAt.getTime() + i + 1)
        });
        userRefundMap[userId] = (userRefundMap[userId] || 0) + amount;
      });
    });

  dbArenaFighters.remove({ _id: { $in: removedArenaFighterIdList }});

  if (! _.isEmpty(userRefundMap)) {
    const usersBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();
    _.pairs(userRefundMap).forEach(([userId, refund]) => {
      usersBulk
        .find({ _id: userId })
        .updateOne({ $inc: { 'profile.money': refund }});
    });
    Meteor.wrapAsync(usersBulk.execute).call(usersBulk);
  }

  if (logDataList.length > 0) {
    const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
    logDataList.forEach((logData) => {
      logBulk.insert(logData);
    });
    Meteor.wrapAsync(logBulk.execute).call(logBulk);
  }

  // 移除（剩下參賽者的）投資人資訊
  dbArenaFighters.update({ arenaId }, { $unset: { investors: 1 } });
}
