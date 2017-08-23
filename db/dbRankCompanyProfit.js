'use strict';
import SimpleSchema from 'simpl-schema';
import { Mongo } from 'meteor/mongo';

//公司營利排行榜
export const dbRankCompanyProfit = new Mongo.Collection('rankCompanyProfit', {
  idGeneration: 'MONGO'
});
export default dbRankCompanyProfit;

//schema
const schema = new SimpleSchema({
  //商業季度
  seasonId: {
    type: String
  },
  //公司ID
  companyId: {
    type: String
  },
  //成交股價
  lastPrice: {
    type: SimpleSchema.Integer
  },
  //參考股價
  listPrice: {
    type: SimpleSchema.Integer
  },
  //總釋出股票
  totalRelease: {
    type: SimpleSchema.Integer
  },
  //參考總市值
  totalValue: {
    type: SimpleSchema.Integer
  },
  //當季營利額
  profit: {
    type: SimpleSchema.Integer
  }
});
dbRankCompanyProfit.attachSchema(schema);
