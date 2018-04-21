'use strict';
import SimpleSchema from 'simpl-schema';
import { Mongo } from 'meteor/mongo';

// 最萌亂鬥大賽資料集
export const dbArena = new Mongo.Collection('arena');
export default dbArena;

const schema = new SimpleSchema({
  // 起始日期
  beginDate: {
    type: Date
  },
  // 結束日期
  endDate: {
    type: Date
  },
  // 報名截止日期
  joinEndDate: {
    type: Date
  },
  // 所有參賽者companyId依隨機順序排列，在報名截止後生成，dbArenaFighters的attackSequence將對應此陣列的index。
  shuffledFighterCompanyIdList: {
    type: Array,
    defaultValue: []
  },
  'shuffledFighterCompanyIdList.$': String,
  // 所有參賽者companyId依存活時間排列，第一位為最後的勝利者
  winnerList: {
    type: Array,
    defaultValue: []
  },
  'winnerList.$': String
});
dbArena.attachSchema(schema);

export function getCurrentArena() {
  return dbArena.findOne({}, { sort: { beginDate: -1 } });
}
