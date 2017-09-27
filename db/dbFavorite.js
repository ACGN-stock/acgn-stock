'use strict';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

//使用者最愛公司資料集
export const dbFavorite = new Mongo.Collection('favorite');
export default dbFavorite;

//schema
const schema = new SimpleSchema({
  //公司id
  companyId: {
    type: String
  },
  //使用者userId
  userId: {
    type: String
  }
});
dbFavorite.attachSchema(schema);
