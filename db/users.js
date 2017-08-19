'use strict';
import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';

const schema = new SimpleSchema({
  //使用者PTT帳號名稱
  username: {
    type: String,
    regEx: /^[0-9a-zA-Z]{2,20}$/
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
      },
      stone: {
        type: SimpleSchema.Integer,
        min: 0,
        defaultValue: 0
      },
      costStone: {
        type: SimpleSchema.Integer,
        min: 0,
        defaultValue: 0
      }
    })
  },
  status: {
    type: new SimpleSchema({
      //是否為上線狀態
      online: {
        type: Boolean,
        optional: true
      },
      //是否發呆中
      idle: {
        type: Boolean,
        optional: true
      },
      //最後活動時間
      lastActivity: {
        type: Date,
        optional: true
      },
      //最後上線資訊
      lastLogin: {
        type: new SimpleSchema({
          //日期
          date: {
            type: Date,
            optional: true
          },
          //IP地址
          ipAddr: {
            type: String,
            optional: true
          },
          //使用瀏覽器
          userAgent: {
            type: String,
            optional: true
          }
        }),
        optional: true
      }
    }),
    optional: true
  },
  // In order to avoid an 'Exception in setInterval callback' from Meteor
  heartbeat: {
    type: Date,
    optional: true
  }
});
Meteor.users.attachSchema(schema);
