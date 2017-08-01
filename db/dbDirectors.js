'use strict';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

//公司持股董事資料集
export const dbDirectors = new Mongo.Collection('directors');
export default dbDirectors;

//schema
const schema = new SimpleSchema({
  //公司名稱
  companyName: {
    type: String
  },
  //董事PTT帳號
  username: {
    type: String
  },
  //擁有股份
  stocks: {
    type: SimpleSchema.Integer,
    min: 1
  }
});
dbDirectors.attachSchema(schema);
