import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

// 事件排程資料集
export const dbEventSchedules = new Mongo.Collection('eventSchedules');

const schema = new SimpleSchema({
  // 排程時間
  scheduledAt: { type: Date }
});
dbEventSchedules.attachSchema(schema);
