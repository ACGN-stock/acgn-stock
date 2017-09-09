'use strict';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

//交易訂單資料集
export const dbAdvertising = new Mongo.Collection('advertising');
export default dbAdvertising;

//schema
const schema = new SimpleSchema({
  //廣告者的帳號ID
  userId: {
    type: String
  },
  //廣告付費額度
  paid: {
    type: SimpleSchema.Integer,
    min: 0
  },
  //廣告訊息
  message: {
    type: String,
    min: 1
  },
  //廣告連結
  url: {
    type: String,
    regEx: SimpleSchema.RegEx.Url,
    optional: true
  },
  //申請廣告日期
  createdAt: {
    type: Date
  }
});
dbAdvertising.attachSchema(schema);

