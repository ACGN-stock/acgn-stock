'use strict';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

//公司持股董事資料集
export const dbDirectors = new Mongo.Collection('directors', {
  idGeneration: 'MONGO'
});
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
  },
  //要在董事會成員裡留的言
  message: {
    type: String,
    max: 100,
    optional: true
  }
});
dbDirectors.attachSchema(schema);
