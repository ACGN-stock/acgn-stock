import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

// 執行緒資訊
export const dbThreads = new Mongo.Collection('threads');
export default dbThreads;

const schema = new SimpleSchema({
  // 是否負則interval work檢查
  doIntervalWork: {
    type: Boolean,
    defaultValue: false
  },
  // 負擔連線數
  connections: {
    type: SimpleSchema.Integer,
    min: 0
  },
  // 上次更新時間
  refreshTime: {
    type: Date
  }
});
dbThreads.attachSchema(schema);
