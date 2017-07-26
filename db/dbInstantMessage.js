'use strict';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

//公司持股董事資料集
export const dbInstantMessage = new Mongo.Collection('instantMessage');
export default dbInstantMessage;

//schema
const schema = new SimpleSchema({
  //訊息類別
  type: {
    type: String,
    min: 1,
    max: 10
  },
  //訊息時間
  createdAt: {
    type: Date
  },
  //訊息來源
  source: {
    type: String
  },
  //訊息應該只會自動散發給特定使用者
  onlyForUsers: [String],
  //訊息內容
  message: {
    type: String,
    min: 1
  }
});
dbInstantMessage.attachSchema(schema);

