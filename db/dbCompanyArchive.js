'use strict';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

//使用者保管庫
export const dbCompanyArchive = new Mongo.Collection('companyArchive');
export default dbCompanyArchive;

const schema = new SimpleSchema({
  //保管狀態
  status: {
    type: String,
    allowedValues: ['archived', 'foundation', 'market']
  },
  //公司名稱
  name: {
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
    type: String
  }
});
dbCompanyArchive.attachSchema(schema);
