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
  //產品公司Id
  companyId: {
    type: String
  },
  //使用者userId
  userId: {
    type: String
  }
});
dbProductLike.attachSchema(schema);

