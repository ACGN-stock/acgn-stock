import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

// 新創公司資料集
export const dbFoundations = new Mongo.Collection('foundations');

const schema = new SimpleSchema({
  // 公司名稱
  companyName: {
    type: String,
    min: 1,
    max: 100
  },
  // 創立人 userId
  founder: {
    type: String
  },
  // 經理人 userId
  manager: {
    type: String
  },
  // 相關搜索用Tag
  tags: {
    type: Array,
    maxCount: 50
  },
  'tags.$': {
    type: String,
    min: 1,
    max: 50
  },
  // 小圖
  pictureSmall: {
    type: String,
    regEx: SimpleSchema.RegEx.Url,
    max: 1000,
    optional: true
  },
  // 大圖
  pictureBig: {
    type: String,
    regEx: SimpleSchema.RegEx.Url,
    max: 1000,
    optional: true
  },
  // 介紹描述
  description: {
    type: String,
    min: 10,
    max: 3000
  },
  // 違規描述
  illegalReason: {
    type: String,
    max: 10,
    optional: true
  },
  // 投資人列表
  invest: {
    type: Array,
    defaultValue: []
  },
  'invest.$': {
    type: new SimpleSchema({
      userId: {
        type: String
      },
      amount: {
        type: SimpleSchema.Integer,
        min: 1
      }
    })
  },
  // 創立計劃開始日期
  createdAt: {
    type: Date
  }
});
dbFoundations.attachSchema(schema);

dbFoundations.findByIdOrThrow = function(id, options) {
  const result = dbFoundations.findOne(id, options);

  if (! result) {
    throw new Meteor.Error(404, `找不到識別碼為「${id}」的新創計劃，該新創計劃可能已經創立成功或失敗！`);
  }

  return result;
};
