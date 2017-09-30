'use strict';
import { Meteor } from 'meteor/meteor';
import { Match } from 'meteor/check';
import SimpleSchema from 'simpl-schema';

export const banTypeList = [
  'accuse', //所有舉報違規行為
  'deal', //所有下達訂單行為
  'chat', //所有聊天發言行為
  'advertise', //所有廣告宣傳行為
  'manager' //擔任經理資格
];

const schema = new SimpleSchema({
  //使用者PTT帳號名稱
  username: {
    type: String,
    optional: true
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
  favorite: {
    type: Array,
    defaultValue: []
  },
  'favorite.$': {
    type: String
  },
  profile: {
    type: new SimpleSchema({
      //驗證類別
      validateType: {
        type: String,
        allowedValues: ['Google', 'PTT', 'Bahamut']
      },
      //使用者名稱
      name: {
        type: String
      },
      //金錢數量
      money: {
        type: SimpleSchema.Integer,
        defaultValue: 0
      },
      lastSeasonTotalWealth: {
        type: SimpleSchema.Integer,
        defaultValue: 0
      },
      //推薦票數量
      vote: {
        type: SimpleSchema.Integer,
        min: 0,
        defaultValue: 0
      },
      //聖晶石數量
      stone: {
        type: SimpleSchema.Integer,
        min: 0,
        defaultValue: 0
      },
      //是否為金管會委員
      isAdmin: {
        type: Boolean,
        defaultValue: false
      },
      //是否處於繳稅逾期的狀態
      notPayTax: {
        type: Boolean,
        defaultValue: false
      },
      //被禁止的權限
      ban: {
        type: Array,
        defaultValue: []
      },
      'ban.$': {
        type: new Match.OneOf(...banTypeList)
      },
      //未登入天數次數紀錄
      noLoginDayCount: {
        type: SimpleSchema.Integer,
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
