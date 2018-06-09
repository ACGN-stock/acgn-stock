import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';

import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbLog } from '/db/dbLog';
import { dbProducts } from '/db/dbProducts';
import { dbSeason } from '/db/dbSeason';
import { dbUserOwnedProducts } from '/db/dbUserOwnedProducts';
import { dbVips, roundVipScore } from '/db/dbVips';

defineMigration({
  version: 19,
  name: 'vip system',
  async up() {
    await Promise.all([
      // 建立 VIP 資訊的 indexes
      dbVips.rawCollection().createIndex({ userId: 1, companyId: 1 }, { unique: true }),
      dbVips.rawCollection().createIndex({ companyId: 1, score: -1, createdAt: -1 }),
      dbVips.rawCollection().createIndex({ companyId: 1, level: -1 }),
      dbVips.rawCollection().createIndex({ userId: 1, level: -1 }),

      // 增加當季公司產品對價格的 index（產品購買分數計算用）
      dbProducts.rawCollection().createIndex({ seasonId: 1, companyId: 1, price: 1 }, {
        partialFilterExpression: { state: 'marketing' }
      })
    ]);

    const seasons = dbSeason.find({}, { sort: { beginDate: -1 } }).fetch();
    if (seasons.length === 0) {
      return;
    }

    const { _id: currentSeasonId } = seasons[0];

    /*
     * 處理過去的產品購買分數
     * 當季：以 1 倍計算
     * 過去所有季度：以 0.8 倍計算
     */
    const vipScoreMap = {};

    seasons.forEach(({ _id: seasonId }) => {
      // 該季度各公司的產品價格最高與最低值
      const companyProductPriceMinMaxMap = dbProducts
        .aggregate([ {
          $match: { seasonId }
        }, {
          $group: {
            _id: '$companyId',
            min: { $min: '$price' },
            max: { $max: '$price' }
          }
        } ])
        .reduce((obj, { _id, min, max }) => {
          obj[_id] = { min, max };

          return obj;
        }, {});

        // 以玩家持有的產品來回推 VIP 分數
      dbUserOwnedProducts
        .find({ seasonId })
        .forEach(({ userId, companyId, price, amount }) => {
          const { min: priceMin, max: priceMax } = companyProductPriceMinMaxMap[companyId];

          const seasonScoreFactor = seasonId === currentSeasonId ? 1.0 : 0.8;

          const totalCost = price * amount;
          const scoreFactor = priceMin === priceMax ? 1 : 1 + 0.2 * (price - priceMin) / (priceMax - priceMin);
          const scoreIncrease = totalCost * scoreFactor * seasonScoreFactor;

          if (scoreIncrease > 0) {
            _.defaults(vipScoreMap, { [userId]: {} });
            const oldScore = vipScoreMap[userId][companyId] || 0;
            const newScore = roundVipScore(oldScore + scoreIncrease);
            vipScoreMap[userId][companyId] = newScore;
          }
        });
    });

    if (_.isEmpty(vipScoreMap)) {
      return;
    }

    // 計算每個玩家在公司的第一次購買產品時間
    const firstBoughtDateMap = dbLog
      .aggregate([ {
        $match: { logType: '購買產品' }
      }, {
        $unwind: '$userId'
      }, {
        $group: {
          _id: { userId: '$userId', companyId: '$companyId' },
          firstBoughtAt: { $min: '$createdAt' }
        }
      } ])
      .reduce((obj, { _id, firstBoughtAt }) => {
        const { userId, companyId } = _id;
        _.defaults(obj, { [userId]: {} });
        obj[userId][companyId] = firstBoughtAt;

        return obj;
      }, {});

    const vipBulk = dbVips.rawCollection().initializeUnorderedBulkOp();

    Object.entries(vipScoreMap).forEach(([userId, subMap]) => {
      Object.entries(subMap).forEach(([companyId, score]) => {
        vipBulk.insert({
          userId,
          companyId,
          score,
          level: 0,
          createdAt: firstBoughtDateMap[userId][companyId]
        });
      });
    });

    Meteor.wrapAsync(vipBulk.execute, vipBulk)();
  }
});
