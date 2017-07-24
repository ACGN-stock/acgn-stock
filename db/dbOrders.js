'use strict';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

//交易訂單資料集
export const dbOrders = new Mongo.Collection('orders');
export default dbOrders;

export const orderTypeList = [
  '購入',
  '賣出'
];

//schema
const schema = new SimpleSchema({
  //訂單所有者的PTT帳號
  username: {
    type: String,
    regEx: /^[0-9a-zA-Z]{4,12}$/
  },
  //訂單股份的所屬公司名稱
  companyName: {
    type: String
  },
  //訂單類別
  orderType: {
    type: String,
    allowedValues: orderTypeList
  },
  //每單位股份的出價
  unitPrice: {
    type: SimpleSchema.Integer,
    min: 1
  },
  //交易股份數量
  amount: {
    type: SimpleSchema.Integer,
    min: 1,
    max: 1000
  },
  //已處理完畢的數量
  done: {
    type: SimpleSchema.Integer,
    min: 1,
    max: 1000,
    defaultValue: 0
  },
  //下單日期
  createdAt: {
    type: Date
  }
});
dbOrders.attachSchema(schema);

