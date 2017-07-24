'use strict';
import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';

const schema = new SimpleSchema({
  //使用者PTT帳號名稱
  username: {
    type: String,
    regEx: /^[0-9a-zA-Z]{4,12}$/
  },
  //驗證成功日期
  createdAt: {
    type: Date
  },
  //登入token紀錄
  services: {
    type: Object,
    optional: true,
    blackbox: true
  },
  profile: {
    type: new SimpleSchema({
      //金錢數量
      money: {
        type: SimpleSchema.Integer,
        min: 0,
        defaultValue: 0
      },
      //推薦票數量
      vote: {
        type: SimpleSchema.Integer,
        min: 0,
        defaultValue: 0
      },
      //是否為可審核檢舉的管理人
      isAdmin: {
        type: Boolean,
        defaultValue: false
      },
      //是否被撤銷了經理人資格
      revokeQualification: {
        type: Boolean,
        defaultValue: false
      }
    })
  },
  // In order to avoid an 'Exception in setInterval callback' from Meteor
  heartbeat: {
    type: Date,
    optional: true
  },
  //上次領取薪水的日期
  lastPayDay: {
    type: Date,
    defaultValue: new Date(0)
  }
});
Meteor.users.attachSchema(schema);
