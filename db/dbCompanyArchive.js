import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';

// 公司保管庫資料集
export const dbCompanyArchive = new Mongo.Collection('companyArchive');
export default dbCompanyArchive;

const schema = new SimpleSchema({
  // 保管狀態
  status: {
    type: String,
    allowedValues: ['archived', 'foundation', 'market']
  },
  // 公司名稱
  companyName: {
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
  }
});
dbCompanyArchive.attachSchema(schema);

dbCompanyArchive.findByIdOrThrow = function(id, options) {
  const result = dbCompanyArchive.findOne(id, options);

  if (! result) {
    throw new Meteor.Error(404, `找不到識別碼為「${id}」的公司或新創資料！`);
  }

  return result;
};
