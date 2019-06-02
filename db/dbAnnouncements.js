import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

import { hasAnyRoles } from './users';

// 系統公告資料集
export const dbAnnouncements = new Mongo.Collection('announcements');

export const announcementCategoryMap = {
  maintenance: {
    displayName: '系統維護',
    announceableBy: ['superAdmin', 'developer']
  },
  fsc: {
    displayName: '金管會',
    announceableBy: ['fscMember']
  },
  plannedRuleChanges: {
    displayName: '規則更動計劃',
    announceableBy: ['planner', 'developer']
  },
  appliedRuleChanges: {
    displayName: '規則更動套用',
    announceableBy: ['planner', 'developer']
  },
  knownProblems: {
    displayName: '已知問題',
    announceableBy: ['planner', 'developer']
  },
  generalAnnouncements: {
    displayName: '營運公告',
    announceableBy: ['planner', 'developer']
  },
  miscellaneous: {
    displayName: '其他雜項',
    announceableBy: ['superAdmin', 'generalManager', 'planner', 'developer', 'fscMember']
  }
};

export function categoryDisplayName(category) {
  return (announcementCategoryMap[category] || { displayName: `未知分類(${category})` }).displayName;
}

export function getAnnounceableCategories(user) {
  if (! user || ! user.profile || ! user.profile.roles) {
    return [];
  }

  return Object.entries(announcementCategoryMap)
    .filter(([, { announceableBy } ]) => {
      return ! announceableBy || hasAnyRoles(user, ...announceableBy);
    })
    .map(([category]) => {
      return category;
    });
}

const schema = new SimpleSchema({
  // 公告人 userId
  creator: {
    type: String
  },
  // 類別
  category: {
    type: String,
    allowedValues: Object.keys(announcementCategoryMap)
  },
  // 主旨
  subject: {
    type: String,
    min: 1,
    max: 100
  },
  // 內容
  content: {
    type: String,
    min: 10,
    max: 3000
  },
  // 已讀玩家列表
  readers: {
    type: Array,
    defaultValue: []
  },
  'readers.$': {
    type: String
  },
  // 建立日期
  createdAt: {
    type: Date
  },
  // 是否已作廢
  voided: {
    type: Boolean,
    defaultValue: false
  },
  // 作廢原因
  voidedReason: {
    type: String,
    optional: true,
    min: 1,
    max: 100
  },
  // 作廢的使用者
  voidedBy: {
    type: String,
    optional: true
  },
  // 作廢時間
  voidedAt: {
    type: Date,
    optional: true
  },
  // 否決連署
  rejectionPetition: {
    type: new SimpleSchema({
      // 活躍玩家人數
      activeUserCount: {
        type: SimpleSchema.Integer,
        min: 0
      },
      // 連署門檻百分比
      thresholdPercent: {
        type: Number,
        min: 0
      },
      // 截止時間
      dueAt: {
        type: Date
      },
      // 通過時間
      passedAt: {
        type: Date,
        optional: true
      },
      // 連署人列表
      signers: {
        type: Array,
        defaultValue: []
      },
      'signers.$': {
        type: String
      }
    }),
    optional: true
  },
  // 否決投票
  rejectionPoll: {
    type: new SimpleSchema({
      // 活躍玩家人數
      activeUserCount: {
        type: SimpleSchema.Integer,
        min: 0
      },
      // 投票門檻人數
      thresholdPercent: {
        type: Number,
        min: 0
      },
      // 截止時間
      dueAt: {
        type: Date
      },
      // 贊成列表
      yesVotes: {
        type: Array,
        defaultValue: []
      },
      'yesVotes.$': {
        type: String
      },
      // 反對列表
      noVotes: {
        type: Array,
        defaultValue: []
      },
      'noVotes.$': {
        type: String
      }
    }),
    optional: true
  }
});
dbAnnouncements.attachSchema(schema);

dbAnnouncements.findByIdOrThrow = function(id, options) {
  const result = dbAnnouncements.findOne(id, options);

  if (! result) {
    throw new Meteor.Error(404, `找不到識別碼為「${id}」的系統公告！`);
  }

  return result;
};
