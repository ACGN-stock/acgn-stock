'use strict';
import SimpleSchema from 'simpl-schema';
import { Mongo } from 'meteor/mongo';

//最萌亂鬥大賽資料集
export const dbArena = new Mongo.Collection('arena');
export default dbArena;

const schema = new SimpleSchema({
  //起始日期
  beginDate: {
    type: Date
  },
  //結束日期
  endDate: {
    type: Date
  },
  //報名截止日期
  joinEndDate: {
    type: Date
  },
  //所有參賽者companyId依攻擊順序排列，在報名截止後開始計算，dbArenaFighters的attackSequence將對應此陣列的index。
  fighterSequence: {
    type: Array,
    defaultValue: []
  },
  'fighterSequence.$': String,
  //所有參賽者companyId依存活時間排列，第一位為最後的勝利者
  winnerList: {
    type: Array,
    defaultValue: []
  },
  'winnerList.$': String
});
dbArena.attachSchema(schema);
