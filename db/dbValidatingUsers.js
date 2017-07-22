'use strict';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

export const dbValidatingUsers = new Mongo.Collection('validatingUsers');
export default dbValidatingUsers;

//schema
const schema = new SimpleSchema({
  //使用者PTT帳號
  username: {
    type: String,
    regEx: /^[0-9a-zA-Z]{4,}$/
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
  insertTime: {
    type: Date
  }
});
dbValidatingUsers.attachSchema(schema);

