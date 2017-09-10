'use strict';
import SimpleSchema from 'simpl-schema';
import { Mongo } from 'meteor/mongo';

//公司產品資料集
export const dbSeason = new Mongo.Collection('season');
export default dbSeason;

//schema
const schema = new SimpleSchema({
  //起始日期
  beginDate: {
    type: Date
  },
  //結束日期
  endDate: {
    type: Date
  },
  //經理人選舉時間(micro time stamp)
  electTime: {
    type: Number,
    optional: true
  },
  //當季有多少驗證通過的使用者
  userCount: {
    type: SimpleSchema.Integer
  },
  //當季有多少推出的新產品
  productCount: {
    type: SimpleSchema.Integer
  },
  //當季每張推薦票可以為產品公司產生多少營利
  votePrice: {
    type: SimpleSchema.Integer
  }
});
dbSeason.attachSchema(schema);
