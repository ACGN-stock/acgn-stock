'use strict';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

export const dbResourceLock = new Mongo.Collection('resourceLock');
export default dbResourceLock;

//schema
const schema = new SimpleSchema({
  //執行鎖定的程式所在thread id
  threadId: {
    type: String
  },
  //導致鎖定的工作名稱
  task: {
    type: String
  },
  //執行鎖定的時間
  time: {
    type: Date
  }
});
dbResourceLock.attachSchema(schema);
