'use strict';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

//交易價格資料集
export const dbTaxes = new Mongo.Collection('taxes', {
  idGeneration: 'MONGO'
});
export default dbTaxes;

//schema
const schema = new SimpleSchema({
  //需繳稅人Id
  userId: {
    type: String
  },
  //需繳納的財產稅金
  tax: {
    type: SimpleSchema.Integer,
    min: 1
  },
  //需繳納的殭屍稅金
  zombie: {
    type: SimpleSchema.Integer,
    min: 1
  },
  //因逾期未繳產生的罰金
  fine: {
    type: SimpleSchema.Integer,
    defaultValue: 0
  },
  //已繳納的稅金
  paid: {
    type: SimpleSchema.Integer,
    defaultValue: 0
  },
  //繳稅期限
  expireDate: {
    type: Date
  }
});
dbTaxes.attachSchema(schema);
