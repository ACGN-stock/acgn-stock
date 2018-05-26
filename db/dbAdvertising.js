import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

// 廣告資料集
export const dbAdvertising = new Mongo.Collection('advertising');
export default dbAdvertising;

const schema = new SimpleSchema({
  // 廣告者的帳號ID
  userId: {
    type: String
  },
  // 廣告付費額度
  paid: {
    type: SimpleSchema.Integer,
    min: 0
  },
  // 廣告訊息
  message: {
    type: String,
    min: 1
  },
  // 廣告連結
  url: {
    type: String,
    regEx: SimpleSchema.RegEx.Url,
    optional: true
  },
  // 申請廣告日期
  createdAt: {
    type: Date
  }
});
dbAdvertising.attachSchema(schema);

dbAdvertising.findByIdOrThrow = function(id, options) {
  const result = dbAdvertising.findOne(id, options);

  if (! result) {
    throw new Meteor.Error(404, `找不到識別碼為「${id}」的廣告！`);
  }

  return result;
};
