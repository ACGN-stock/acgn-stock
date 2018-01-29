import { Meteor } from 'meteor/meteor';

import { dbCompanies } from '/db/dbCompanies';
import { dbVips, getVipThresholds } from '/db/dbVips';

// 降級末達成門檻的 VIP
export function levelDownThresholdUnmetVips() {
  // 計算所有公司的分數門檻
  const companyVipThresholdsMap = dbCompanies
    .find({ isSeal: false }, { fields: { capital: 1 } })
    .fetch()
    .reduce((obj, { _id, capital }) => {
      obj[_id] = getVipThresholds({ capital });

      return obj;
    }, {});

  const { vipLevelDownChance } = Meteor.settings.public;
  const vipModifyList = [];

  dbVips.find().forEach(({ userId, companyId, score, level }) => {
    const vipThresholds = companyVipThresholdsMap[companyId];

    const index = [...vipThresholds, Infinity].findIndex((threshold) => {
      return threshold > score;
    });

    if (index === -1) {
      return;
    }

    const maxLevel = index - 1;

    // 不處理升級或同級
    if (maxLevel >= level) {
      return;
    }

    // 機率性降級
    if (Math.random() > vipLevelDownChance) {
      return;
    }

    // 符合條件的 VIP，調降一級
    vipModifyList.push({
      query: { userId, companyId },
      update: { $set: { level: level - 1 } }
    });
  });

  if (vipModifyList.length > 0) {
    const vipBulk = dbVips.rawCollection().initializeUnorderedBulkOp();
    vipModifyList.forEach(({ query, update }) => {
      vipBulk.find(query).update(update);
    });
    Meteor.wrapAsync(vipBulk.execute, vipBulk)();
  }
}
