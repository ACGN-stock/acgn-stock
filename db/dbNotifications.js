import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

// 通知資料集
export const dbNotifications = new Mongo.Collection('notifications', { idGeneration: 'MONGO' });

export const notificationCategories = {
  ANNOUNCEMENT: 'announcement', // 公告
  FSC_LOG: 'fscLog', // 重要金管會紀錄
  VIOLATION_CASE: 'violationCase' // 違規案件
};

const schema = new SimpleSchema({
  // 通知類別
  category: {
    type: String,
    allowedValues: Object.values(notificationCategories)
  },
  // 被通知的使用者
  targetUser: {
    type: String
  },
  // 通知時間
  notifiedAt: {
    type: Date
  },
  // 與此則通知相關的資料
  data: {
    type: Object,
    blackbox: true,
    optional: true
  }
});
dbNotifications.attachSchema(schema);
