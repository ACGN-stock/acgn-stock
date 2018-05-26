import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';
import { stripIndent } from 'common-tags';

import { hasBanned } from './users';

// 違規案件資料集
export const dbViolationCases = new Mongo.Collection('violationCases');

export const violatorTypeList = ['user', 'company', 'product'];

export function violatorTypeDisplayName(violatorType) {
  switch (violatorType) {
    case 'user': return '使用者';
    case 'company': return '公司';
    case 'product': return '產品';
    default: return violatorType;
  }
}

export const stateMap = {
  pending: {
    displayName: '待處理',
    nextStates: ['accepted', 'rejected']
  },
  accepted: {
    displayName: '已受理',
    nextStates: ['closed']
  },
  rejected: {
    displayName: '已駁回',
    nextStates: []
  },
  closed: {
    displayName: '已結案',
    nextStates: []
  }
};

export function stateDisplayName(state) {
  return (stateMap[state] || { displayName: `未知(${state})` }).displayName;
}

export const categoryMap = {
  company: {
    displayName: '公司違規',
    allowedInitialViolatorTypes: ['company']
  },
  foundation: {
    displayName: '新創違規',
    allowedInitialViolatorTypes: ['company']
  },
  product: {
    displayName: '產品違規',
    allowedInitialViolatorTypes: ['product']
  },
  advertising: {
    displayName: '廣告違規',
    allowedInitialViolatorTypes: ['user']
  },
  multipleAccounts: {
    displayName: '分身違規',
    allowedInitialViolatorTypes: ['user'],
    descriptionTemplate: stripIndent(String.raw)``
  },
  miscellaneous: {
    displayName: '其他違規',
    allowedInitialViolatorTypes: violatorTypeList
  }
};

export function categoryDisplayName(category) {
  return (categoryMap[category] || { displayName: `未知(${category})` }).displayName;
}

export const violatorSchema = new SimpleSchema({
  // 違規者的型態
  violatorType: {
    type: String,
    allowedValues: violatorTypeList
  },
  // 違規者的 ID
  violatorId: {
    type: String
  }
});

const schema = new SimpleSchema({
  // 舉報者的 user ID
  informer: {
    type: String
  },
  // 違規案件目前處理狀態
  state: {
    type: String,
    allowedValues: Object.keys(stateMap)
  },
  // 違規案件類型
  category: {
    type: String,
    allowedValues: Object.keys(categoryMap)
  },
  // 案件描述
  description: {
    type: String,
    min: 10,
    max: 3000
  },
  // 違規名單
  violators: {
    type: Array,
    defaultValue: []
  },
  'violators.$': violatorSchema,
  // 未讀的使用者標記
  unreadUsers: {
    type: Array,
    defaultValue: []
  },
  'unreadUsers.$': {
    type: String
  },
  // 相關案件
  relatedCases: {
    type: Array,
    defaultValue: []
  },
  'relatedCases.$': {
    type: String
  },
  // 建立日期
  createdAt: {
    type: Date
  },
  // 最後更新日期
  updatedAt: {
    type: Date
  },
  // 受理日期
  acceptedAt: {
    type: Date,
    optional: true
  },
  // 駁回日期
  rejectedAt: {
    type: Date,
    optional: true
  },
  // 結案日期
  closedAt: {
    type: Date,
    optional: true
  }
});
dbViolationCases.attachSchema(schema);

dbViolationCases.findByIdOrThrow = function(id, options) {
  const result = dbViolationCases.findOne(id, options);

  if (! result) {
    throw new Meteor.Error(404, `找不到識別碼為「${id}」的違規案件！`);
  }

  return result;
};

export function canUserReportViolation(user) {
  return user && ! hasBanned(user, 'accuse');
}
