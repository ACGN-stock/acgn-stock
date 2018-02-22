import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { dbCompanies } from '/db/dbCompanies';
import { dbVips, getVipThresholds, VIP_LEVEL5_MAX_COUNT } from '/db/dbVips';
import { debug } from '/server/imports/utils/debug';

// 更新全市場的 VIP 等級
export function checkVipLevels() {
  debug.log('checkVipLevels');
  adjustVipLevelsByScore();
  levelDownExcessiveLevel5Vips();
}

// 依據目前分數更新的 vip 等級
function adjustVipLevelsByScore() {
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

      // Level 4 以下只升不降、level 5 至多降至 level 4
      const newLevel = Math.max(maxLevel, Math.min(4, level));

      if (newLevel === level) {
        return;
      }

      vipModifyList.push({
        query: { userId, companyId },
        update: { $set: { level: newLevel } }
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

// 降級超過人數的 level 5 VIP
function levelDownExcessiveLevel5Vips() {
  const unsealedCompanyIds = _.pluck(dbCompanies.find({ isSeal: false }, { fields: { _id: 1 } }).fetch(), '_id');

  const vipModifyList = [];

  // 若是 level 5 超過人數，將剩餘的退級回 level 4
  dbVips
    .aggregate([ {
      $match: {
        companyId: { $in: unsealedCompanyIds },
        level: 5
      }
    }, {
      $sort: { score: -1, createdAt: 1 }
    }, {
      $group: {
        _id: '$companyId',
        candidates: { $push: '$userId' },
        candidateCount: { $sum: 1 }
      }
    }, {
      $match: {
        candidateCount: { $gt: VIP_LEVEL5_MAX_COUNT }
      }
    } ])
    .forEach(({ _id: companyId, candidates }) => {
      const winners = _.take(candidates, VIP_LEVEL5_MAX_COUNT);

      vipModifyList.push({
        query: { companyId, userId: { $nin: winners }, level: 5 },
        update: { $set: { level: 4 } }
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
