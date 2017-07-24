'use strict';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

//公司產品資料集
export const dbSeasonRecord = new Mongo.Collection('seasonRecord');
export default dbSeasonRecord;

//schema
const schema = new SimpleSchema({
  //開始日期
  startDate: {
    type: Date
  },
  //預計結束日期(會有誤差)
  endDate: {
    type: Date
  }
});
dbSeasonRecord.attachSchema(schema);
