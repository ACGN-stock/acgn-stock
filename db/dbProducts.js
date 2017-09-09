'use strict';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

//公司產品資料集
export const dbProducts = new Mongo.Collection('products');
export default dbProducts;

export const productTypeList = [
  '繪圖',
  'ANSI',
  '影音',
  '文字',
  '三次元',
  '裏物'
];

//schema
const schema = new SimpleSchema({
  //產品名稱
  productName: {
    type: String,
    min: 4,
    max: 255
  },
  //公司Id
  companyId: {
    type: String
  },
  //推出季度
  seasonId: {
    type: String
  },
  //此產品的狀態。0 => 當季推出產品，1 => 上季推出產品，待投票結算營利中，2 => 過季產品。
  overdue: {
    type: Number,
    allowedValues: [0, 1, 2],
    defaultValue: 0
  },
  //產品類別
  type: {
    type: String,
    allowedValues: productTypeList
  },
  //產品url
  url: {
    type: String,
    regEx: SimpleSchema.RegEx.Url
  },
  //總票數
  votes: {
    type: SimpleSchema.Integer,
    defaultValue: 0
  },
  //喜愛股東數
  likeCount: {
    type: SimpleSchema.Integer,
    defaultValue: 0
  },
  //上架日期
  createdAt: {
    type: Date
  }
});
dbProducts.attachSchema(schema);

