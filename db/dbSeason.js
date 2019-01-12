import SimpleSchema from 'simpl-schema';
import { Mongo } from 'meteor/mongo';

// 季度資料集
export const dbSeason = new Mongo.Collection('season');
export default dbSeason;

const schema = new SimpleSchema({
  // 賽季的第幾季度
  ordinal: {
    type: SimpleSchema.Integer,
    min: 1
  },
  // 起始日期
  beginDate: {
    type: Date
  },
  // 結束日期
  endDate: {
    type: Date
  },
  // 當季有多少驗證通過的使用者
  userCount: {
    type: SimpleSchema.Integer
  },
  // 當季起始時有多少未被查封的公司
  companiesCount: {
    type: SimpleSchema.Integer
  },
  // 當季有多少推出的新產品
  productCount: {
    type: SimpleSchema.Integer
  }
});
dbSeason.attachSchema(schema);

// 取得目前商業季度
export function getCurrentSeason() {
  return dbSeason.findOne({}, { sort: { beginDate: -1 } }); // TODO 以實際開始時間取代對齊的開始時間
}

// 取得前一個商業季度
export function getPreviousSeason() {
  return dbSeason.findOne({}, { sort: { beginDate: -1 }, skip: 1 });
}

// 每個使用者在季度一開始有多少推薦票
export function getInitialVoteTicketCount(seasonData) {
  return Math.max(Math.floor(Math.log10(seasonData.companiesCount) * 18), 0);
}
