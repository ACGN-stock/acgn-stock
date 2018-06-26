import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

// 稅金資料集
export const dbTaxes = new Mongo.Collection('taxes', {
  idGeneration: 'MONGO'
});
export default dbTaxes;

const schema = new SimpleSchema({
  // 需繳稅人Id
  userId: {
    type: String
  },
  // 需繳納的股票稅
  stockTax: {
    type: SimpleSchema.Integer,
    min: 0
  },
  // 需繳納的現金稅
  moneyTax: {
    type: SimpleSchema.Integer,
    min: 0
  },
  // 需繳納的殭屍稅金
  zombieTax: {
    type: SimpleSchema.Integer,
    min: 0
  },
  // 因逾期未繳產生的罰金
  fine: {
    type: SimpleSchema.Integer,
    defaultValue: 0
  },
  // 已繳納的稅金
  paid: {
    type: SimpleSchema.Integer,
    defaultValue: 0
  },
  // 繳稅期限
  expireDate: {
    type: Date
  }
});
dbTaxes.attachSchema(schema);
