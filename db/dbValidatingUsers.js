'use strict';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

//待驗證的PTT使用者資料集
export const dbValidatingUsers = new Mongo.Collection('validatingUsers');
export default dbValidatingUsers;

//schema
const schema = new SimpleSchema({
  //使用者PTT帳號或巴哈姆特帳號(巴哈姆特帳號會前綴以?)
  username: {
    type: String
  },
  //使用者登入密碼
  password: {
    type: String
  },
  //Server向PTT指定文章查詢推文使用的驗證碼
  validateCode: {
    type: String,
    regEx: /^[0-9a-zA-Z]{10}$/
  },
  createdAt: {
    type: Date
  }
});
dbValidatingUsers.attachSchema(schema);
