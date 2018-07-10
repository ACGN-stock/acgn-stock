import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Match } from 'meteor/check';
import SimpleSchema from 'simpl-schema';

import { banTypeList, userRoleMap } from './users';

// 使用者保管庫
export const dbUserArchive = new Mongo.Collection('userArchive');

const schema = new SimpleSchema({
  // 保管狀態
  status: {
    type: String,
    allowedValues: ['archived', 'registered']
  },
  // 使用者顯示名稱(如驗證來源為Google，則保存Email)
  name: {
    type: String
  },
  // 帳號驗證來源
  validateType: {
    type: String,
    allowedValues: ['Google', 'PTT', 'Bahamut']
  },
  // google帳號要取得暱稱時需使用的access token
  accessToken: {
    type: String,
    optional: true
  },
  // 聖晶石數量
  saintStones: {
    type: SimpleSchema.Integer,
    min: 0,
    defaultValue: 0
  },
  // 被禁止的權限
  ban: {
    type: Array,
    defaultValue: []
  },
  'ban.$': {
    type: new Match.OneOf(...banTypeList)
  },
  // 使用者的系統權限組
  roles: {
    type: Array,
    defaultValue: []
  },
  'roles.$': {
    type: String,
    allowedValues: Object.keys(userRoleMap)
  }
});
dbUserArchive.attachSchema(schema);

dbUserArchive.findByIdOrThrow = function(id, options) {
  const result = this.findOne(id, options);
  if (! result) {
    throw new Meteor.Error(404, `找不到識別碼為「${id}」的使用者封存資料！`);
  }

  return result;
};
