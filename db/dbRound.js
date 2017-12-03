'use strict';
import SimpleSchema from 'simpl-schema';
import { Mongo } from 'meteor/mongo';

//賽季資料集
export const dbRound = new Mongo.Collection('round');
export default dbRound;

const schema = new SimpleSchema({
  //起始日期
  beginDate: {
    type: Date
  },
  //結束日期
  endDate: {
    type: Date
  }
});
dbRound.attachSchema(schema);
