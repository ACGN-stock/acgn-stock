import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

import { MathUtil } from '/common/imports/utils/MathUtil';

// VIP level 5 最多人數
export const VIP_LEVEL5_MAX_COUNT = 7;

// VIP 分數要保持的小數位數
const VIP_SCORE_DECIMAL_PLACES = 3;

// 將分數四捨五入至 VIP 分數所需之小數位
export function roundVipScore(x) {
  return MathUtil.roundToDecimalPlaces(x, VIP_SCORE_DECIMAL_PLACES);
}

// 取得各等級 VIP 的門檻值
export function getVipThresholds({ capital }) {
  const baseThreshold = Math.pow(1487 / capital, 0.6) * capital;

  return [0, 0.2, 0.4, 0.6, 0.8, 1].map((n) => {
    return roundVipScore(n * baseThreshold);
  });
}

// 公司 VIP 會員資料集
export const dbVips = new Mongo.Collection('vips', { idGeneration: 'MONGO' });

const schema = new SimpleSchema({
  // 公司id
  companyId: {
    type: String
  },
  // 玩家id
  userId: {
    type: String
  },
  // 目前等級
  level: {
    type: SimpleSchema.Integer,
    min: 0,
    defaultValue: 0
  },
  // 目前分數
  score: {
    type: Number,
    min: 0,
    defaultValue: 0
  },
  // 建立時間
  createdAt: {
    type: Date
  }
});

dbVips.attachSchema(schema);
