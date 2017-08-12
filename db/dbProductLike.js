'use strict';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

//公司產品資料集
export const dbProductLike = new Mongo.Collection('productLike');
export default dbProductLike;

//schema
const schema = new SimpleSchema({
  //產品ID
  productId: {
    type: String
  },
  //公司名稱
  companyName: {
    type: String
  },
  //使用者名稱
  username: {
    type: String
  }
});
dbProductLike.attachSchema(schema);

