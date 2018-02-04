import { Meteor } from 'meteor/meteor';

import { dbVips, roundVipScore } from '/db/dbVips';

// 調整前一季得到的 VIP 分數
export function adjustPreviousSeasonVipScores() {
  const { vipPreviousSeasonScoreWeight } = Meteor.settings.public;

  const vipModifyList = [];

  dbVips.find().forEach(({ userId, companyId, score }) => {
    const newScore = roundVipScore(score * vipPreviousSeasonScoreWeight);

    if (newScore !== score) {
      vipModifyList.push({
        query: { userId, companyId },
        update: { $set: { score: newScore } }
      });
    }
  });

  if (vipModifyList.length > 0) {
    const vipBulk = dbVips.rawCollection().initializeUnorderedBulkOp();
    vipModifyList.forEach(({ query, update }) => {
      vipBulk.find(query).update(update);
    });
    Meteor.wrapAsync(vipBulk.execute, vipBulk)();
  }
}
