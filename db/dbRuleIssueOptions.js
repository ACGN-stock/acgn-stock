import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

// 議題選項資料集
export const dbRuleIssueOptions = new Mongo.Collection('ruleIssueOptions');
export default dbRuleIssueOptions;

const schema = new SimpleSchema({
  // 議題選項標題
  title: {
    type: String,
    min: 1,
    max: 100
  },
  // 議題選項順序
  order: {
    type: SimpleSchema.Integer
  },
  // 支持此選項的使用者userId
  votes: {
    type: Array,
    defaultValue: []
  },
  'votes.$': {
    type: String
  }
});
dbRuleIssueOptions.attachSchema(schema);
