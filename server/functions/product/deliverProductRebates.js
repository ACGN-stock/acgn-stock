import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { dbUserOwnedProducts } from '/db/dbUserOwnedProducts';
import { dbLog } from '/db/dbLog';
import { getCurrentSeason } from '/db/dbSeason';

// 發放產品滿額回饋金給使用者
export function deliverProductRebates() {
  const { divisorAmount, deliverAmount } = Meteor.settings.public.productRebates;

  const { _id: seasonId } = getCurrentSeason();

  const rebateList = dbUserOwnedProducts
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
    }, {
      $project: {
        rebate: { $multiply: [deliverAmount, { $floor: { $divide: ['$totalCost', divisorAmount] } } ] }
      }
    }, {
      $match: { rebate: { $gt: 0 } }
    } ]);

  if (_.isEmpty(rebateList)) {
    return;
  }

  const userBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();
  const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
  const logSchema = dbLog.simpleSchema();

  const nowDate = new Date();

  rebateList.forEach(({ _id: { userId, companyId }, rebate }) => {
    userBulk.find({ _id: userId }).updateOne({ $inc: { 'profile.money': rebate } });
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
