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
  const unsealedCompanyIds = Object.keys(companyVipThresholdsMap);

  const vipModifyList = [];

  dbVips
    .find({ companyId: { $in: unsealedCompanyIds } })
    .forEach(({ userId, companyId, score, level }) => {
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

      // 降級至最低符合的等級
      vipModifyList.push({
        query: { userId, companyId },
        update: { $set: { level: maxLevel } }
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
