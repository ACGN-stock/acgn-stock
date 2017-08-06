'use strict';
import SimpleSchema from 'simpl-schema';
import { Mongo } from 'meteor/mongo';

//公司產品資料集
export const dbConfig = new Mongo.Collection('config');
export default dbConfig;

//schema
const schema = new SimpleSchema({
  //驗證使用者帳號使用的推文文章PTT Web版頁面url
  validateUserUrl: {
    type: String
  },
  //驗證使用者帳號使用的推文文章所在的PTT板面
  validateUserBoardName: {
    type: String
  },
  //驗證使用者帳號使用的推文文章在板上的AID
  validateUserAID: {
    type: String
  }
});
dbConfig.attachSchema(schema);
