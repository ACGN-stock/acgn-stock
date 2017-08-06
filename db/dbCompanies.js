'use strict';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

//公司資料集
export const dbCompanies = new Mongo.Collection('companies');
export default dbCompanies;

//schema
const schema = new SimpleSchema({
  //公司名稱
  companyName: {
    type: String,
    min: 1,
    max: 100
  },
  //總經理username
  manager: {
    type: String
  },
  //董事長的稱謂
  chairmanTitle: {
    type: String,
    max: 20,
    defaultValue: '董事長'
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
    regEx: /^data:image\/[a-z0-9-+.]+;base64,([A-Za-z0-9!$&',()*+;=\-._~:@/?%\s]*)$/,
    max: 262144,
    optional: true
  },
  //大圖
  pictureBig: {
    type: String,
    regEx: /^data:image\/[a-z0-9-+.]+;base64,([A-Za-z0-9!$&',()*+;=\-._~:@/?%\s]*)$/,
    max: 1048576,
    optional: true
  },
  //介紹描述
  description: {
    type: String,
    min: 10,
    max: 1000
  },
  //目前總釋出股份
  totalRelease: {
    type: SimpleSchema.Integer,
    min: 0
  },
  //最後成交價格
  lastPrice: {
    type: SimpleSchema.Integer,
    min: 0
  },
  //參考每股單價
  listPrice: {
    type: SimpleSchema.Integer,
    min: 0
  },
  //當季已營利
  profit: {
    type: SimpleSchema.Integer,
    min: 0,
    defaultValue: 0
  },
  //參考總市值
  totalValue: {
    type: SimpleSchema.Integer,
    min: 0
  },
  //選舉經理時的候選者列表
  candidateList: {
    type: Array
  },
  'candidateList.$': {
    type: String
  },
  //選舉經理時的各候選者的支持董事列表
  voteList: {
    type: Array,
    defaultValue: [ [] ]
  },
  'voteList.$': [String],
  //公司上市日期
  createdAt: {
    type: Date
  }
});
dbCompanies.attachSchema(schema);
