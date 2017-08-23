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
  //公司id
  companyId: {
    type: String
  },
  //董事userId
  userId: {
    type: String
  },
  //擁有股份
  stocks: {
    type: SimpleSchema.Integer,
    min: 1
  },
  createdAt: {
    type: Date
  },
  //要在董事會成員裡留的言
  message: {
    type: String,
    max: 100,
    optional: true
  }
});
dbDirectors.attachSchema(schema);
