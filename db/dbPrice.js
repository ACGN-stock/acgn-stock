'use strict';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

//交易價格資料集
export const dbPrice = new Mongo.Collection('price', {
  idGeneration: 'MONGO'
});
export default dbPrice;

//schema
const schema = new SimpleSchema({
  //股份所屬公司ID
  companyId: {
    type: String
  },
  //價格
  price: {
    type: SimpleSchema.Integer,
    min: 1
  },
  //交易日期
  createdAt: {
    type: Date
  }
});
dbPrice.attachSchema(schema);

