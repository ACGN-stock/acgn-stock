'use strict';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

//新創資料集
export const dbFoundations = new Mongo.Collection('foundations');
export default dbFoundations;

//schema
const schema = new SimpleSchema({
  //公司名稱
  companyName: {
    type: String,
    min: 1,
    max: 100
  },
  //創立人userId
  manager: {
    type: String
  },
  //相關搜索用Tag
  tags: {
    type: Array,
    maxCount: 50
  },
  'tags.$': {
    type: String,
    min: 1,
    max: 50
  },
  //小圖
  pictureSmall: {
    type: String,
    regEx: SimpleSchema.RegEx.Url,
    max: 1000,
    optional: true
  },
  //大圖
  pictureBig: {
    type: String,
    regEx: SimpleSchema.RegEx.Url,
    max: 1000,
    optional: true
  },
  //介紹描述
  description: {
    type: String,
    min: 10,
    max: 3000
  },
  //投資人列表
  invest: {
    type: Array,
    defaultValue: []
  },
  'invest.$': {
    type: new SimpleSchema({
      userId: {
        type: String
      },
      amount: {
        type: SimpleSchema.Integer,
        min: 1
      }
    })
  },
  //創立計劃開始日期
  createdAt: {
    type: Date
  }
});
dbFoundations.attachSchema(schema);

