import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

// 公司員工資料集
export const dbEmployees = new Mongo.Collection('employees');
export default dbEmployees;

const schema = new SimpleSchema({
  // 公司Id
  companyId: {
    type: String
  },
  // 使用者userId
  userId: {
    type: String
  },
  // 登記加入時間
  registerAt: {
    type: Date
  },
  // 目前是否在職
  employed: {
    type: Boolean,
    defaultValue: false
  },
  // 任期是否已結束
  resigned: {
    type: Boolean,
    defaultValue: false
  },
  // 員工留言
  message: {
    type: String,
    max: 100,
    optional: true
  }
});
dbEmployees.attachSchema(schema);
