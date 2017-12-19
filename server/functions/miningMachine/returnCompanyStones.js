import { Meteor } from 'meteor/meteor';

import { dbLog } from '/db/dbLog';
import { dbCompanyStones } from '/db/dbCompanyStones';

// 歸還公司中所有的石頭
export function returnCompanyStones(companyId) {
  const companyStonesCursor = dbCompanyStones.find({ companyId }, { userId: 1, stoneType: 1 });

  if (companyStonesCursor.count() === 0) {
    return;
  }

  const userBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();
  const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
  const logSchema = dbLog.simpleSchema();
  const nowDate = new Date();

  companyStonesCursor.forEach(({ userId, stoneType }) => {
    userBulk.find({ _id: userId }).updateOne({ $inc: { [`profile.stones.${stoneType}`]: 1 } });

    const logData = logSchema.clean({
      logType: '礦機取石',
      userId: [userId],
      companyId,
      data: { stoneType },
      createdAt: nowDate
    });
    logSchema.validate(logData);

    logBulk.insert(logData);
  });

  Meteor.wrapAsync(userBulk.execute).call(userBulk);
  Meteor.wrapAsync(logBulk.execute).call(logBulk);

  dbCompanyStones.remove({ companyId });
}
