import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';

import { dbFoundations } from '/db/dbFoundations';
import { dbLog } from '/db/dbLog';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { executeBulksSync } from '/server/imports/utils/executeBulksSync';

// 新創公司失敗之處理
export function doOnFoundationFailure(foundationData) {
  const { _id: companyId, invest, companyName, founder } = foundationData;

  const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
  const usersBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();

  const createdAt = new Date();

  logBulk.insert({
    logType: '創立失敗',
    userId: _.pluck(invest, 'userId'),
    data: { companyName },
    createdAt: createdAt
  });

  invest.forEach(({ userId, amount }, index) => {
    if (userId === founder) {
      amount -= Meteor.settings.public.founderEarnestMoney;
    }

    logBulk.insert({
      logType: '創立退款',
      userId: [userId],
      data: {
        companyName,
        refund: amount
      },
      createdAt: new Date(createdAt.getTime() + index + 1)
    });

    usersBulk
      .find({ _id: userId })
      .updateOne({ $inc: { 'profile.money': amount } });
  });

  dbFoundations.remove(companyId);
  dbCompanyArchive.update(companyId, { $set: { status: 'archived' } });

  logBulk
    .find({ companyId })
    .update({ $unset: { companyId: 1 } });

  executeBulksSync(logBulk, usersBulk);
}
