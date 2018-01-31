import { Meteor } from 'meteor/meteor';

import { dbCompanyStones } from '/db/dbCompanyStones';

// 歸還公司中所有的石頭
export function returnCompanyStones(companyId) {
  const companyStonesCursor = dbCompanyStones.find({ companyId }, { userId: 1, stoneType: 1 });

  if (companyStonesCursor.count() === 0) {
    return;
  }

  const userBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();

  companyStonesCursor.forEach(({ userId, stoneType }) => {
    userBulk.find({ _id: userId }).updateOne({ $inc: { [`profile.stones.${stoneType}`]: 1 } });
  });

  Meteor.wrapAsync(userBulk.execute, userBulk)();

  dbCompanyStones.remove({ companyId });
}
