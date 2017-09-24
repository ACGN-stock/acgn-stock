'use strict';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

//交易價格資料集
export const dbThreads = new Mongo.Collection('threads');
export default dbThreads;

//schema
const schema = new SimpleSchema({
  //是否負則interval work檢查
  doIntervalWork: {
    type: Boolean,
    defaultValue: false
  },
  //負擔連線數
  connections: {
    type: SimpleSchema.Integer,
    min: 0
  },
  //上次更新時間
  refreshTime: {
    type: Date
  }
});
dbThreads.attachSchema(schema);
