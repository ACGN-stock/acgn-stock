'use strict';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

//公司持股董事資料集
export const dbVoteRecord = new Mongo.Collection('voteRecord');
export default dbVoteRecord;

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
dbVoteRecord.attachSchema(schema);
