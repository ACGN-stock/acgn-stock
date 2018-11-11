import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { dbUserOwnedProducts } from '/db/dbUserOwnedProducts';
import { dbLog } from '/db/dbLog';
import { getCurrentSeason } from '/db/dbSeason';

// 發放產品滿額回饋金給使用者
export function deliverProductRebates() {
  const rebateList = getRebateList();
  if (_.isEmpty(rebateList)) {
    return;
  }

  const userBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();
  const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
  const logSchema = dbLog.simpleSchema();

  const nowDate = new Date();

  rebateList.forEach(({ _id: { userId, companyId }, rebate }) => {
    userBulk.find({ _id: userId }).updateOne({ $inc: { 'profile.vouchers': rebate } });
    const logData = logSchema.clean({
      logType: '消費回饋',
      userId: [userId],
      companyId,
      data: { rebate },
      createdAt: nowDate
    });
    logSchema.validate(logData);
    logBulk.insert(logData);
  });

  Meteor.wrapAsync(userBulk.execute, userBulk)();
  Meteor.wrapAsync(logBulk.execute, logBulk)();
}

function getRebateList() {
  const costList = getCostList();
  const rebateList = [];
  costList.forEach(({ _id, totalCost }) => {
    const rebate = computeRebate(totalCost);
    if (rebate > 0) {
      rebateList.push({ _id, rebate });
    }
  });

  return rebateList;
}

function getCostList() {
  const { _id: seasonId } = getCurrentSeason();
  const costList = dbUserOwnedProducts
    .aggregate([ {
      $match: { seasonId }
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
      $match: { 'companyData.isSeal': false }
    }, {
      $group: {
        _id: { userId: '$userId', companyId: '$companyId' },
        totalCost: { $sum: { $multiply: ['$amount', '$price'] } }
      }
    } ]);

  return costList;
}

export function computeRebate(totalCost) {
  const { divisorAmount, initialDeliverPercent, minDeliverPercent } = Meteor.settings.public.productRebates;
  let rebate = 0;
  for (let i = 1; i * divisorAmount <= totalCost; i += 1) {
    const deliverPercent = Math.max(
      initialDeliverPercent - Math.log10(i) / 7.7 * 100,
      minDeliverPercent
    );
    rebate += divisorAmount * deliverPercent / 100;
  }

  return Math.floor(rebate);
}
