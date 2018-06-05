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
    nextStates: ['processing']
  },
  processing: {
    displayName: '處理中',
    nextStates: ['closed', 'rejected']
  },
  rejected: {
    displayName: '已駁回',
    nextStates: ['processing']
  },
  closed: {
    displayName: '已結案',
    nextStates: ['processing']
  }
};

export function stateDisplayName(state) {
  return (stateMap[state] || { displayName: `未知(${state})` }).displayName;
}

export const categoryMap = {
  company: {
    displayName: '公司違規',
    allowedInitialViolatorTypes: ['company'],
    descriptionTemplate: stripIndent(String.raw)`
      > 以下請將各個 <…> 欄位依照指示連同角括號取代為您所提供的內容。
      > 公司法連結：https://goo.gl/b2sscm
      > 違規事項不只一條時可條列式列出。
      >
      > 我已閱讀完以上注意事項，請將本行以上刪除。

      公司【<請輸入公司名稱>】涉嫌違規如下：
      <請輸入違規事項>
      有違規嫌疑。
    `
  },
  foundation: {
    displayName: '新創違規',
    allowedInitialViolatorTypes: ['company'],
    descriptionTemplate: stripIndent(String.raw)`
      > 以下請將各個 <…> 欄位依照指示連同角括號取代為您所提供的內容。
      > 公司法連結：https://goo.gl/b2sscm
      > 違規事項不只一條時可條列式列出。
      >
      > 我已閱讀完以上注意事項，請將本行以上刪除。

      新創計畫【<請輸入新創計畫名稱>】涉嫌違規如下：
      <請輸入違規事項>
      有違規嫌疑。
    `
  },
  product: {
    displayName: '產品違規',
    allowedInitialViolatorTypes: ['product'],
    descriptionTemplate: stripIndent(String.raw)`
      > 以下請將各個 <…> 欄位依照指示連同角括號取代為您所提供的內容。
      > 公司法連結：https://goo.gl/b2sscm
      > 違規事項不只一條時可條列式列出。
      >
      > 我已閱讀完以上注意事項，請將本行以上刪除。

      公司【<請輸入公司名稱>】
      產品【<請輸入產品名稱>】
      其涉嫌違規如下：
      <請輸入違規事項>
      有違規嫌疑。
    `
  },
  advertising: {
    displayName: '廣告違規',
    allowedInitialViolatorTypes: ['user'],
    descriptionTemplate: stripIndent(String.raw)`
      > 以下請將各個 <…> 欄位依照指示連同角括號取代為您所提供的內容。
      > ACGN股市廣告規則：https://hackmd.io/s/r1whDmSqM
      > 違規事項不只一條時可條列式列出。
      >
      > 我已閱讀完以上注意事項，請將本行以上刪除。

      玩家 <請輸入玩家帳號名稱> (識別碼：<請輸入玩家識別碼>)
      其所發布之廣告：
      <請輸入廣告內容>
      有違規嫌疑如下：
      <請輸入檢舉事由>
    `
  },
  multipleAccounts: {
    displayName: '分身違規',
    allowedInitialViolatorTypes: ['user'],
    descriptionTemplate: stripIndent(String.raw)`
      > 以下請將各個 <…> 欄位依照指示連同角括號取代為您所提供的內容。
      > ACGN股市個人法：https://goo.gl/TRC4jT
      > 可增加玩家數量，請詳細敘述檢舉事由。
      > 注意：IP相同並非判定分身之唯一依據。
      >
      > 我已閱讀完以上注意事項，請將本行以上刪除。

      以下玩家疑似有分身之嫌疑：

      1. 玩家 <請輸入玩家帳號名稱> (識別碼：<請輸入玩家識別碼>)
      2. 玩家 <請輸入玩家帳號名稱> (識別碼：<請輸入玩家識別碼>)

      以上ID疑似為分身，證據如下：
      <請輸入檢舉事由>
    `
  },
  miscellaneous: {
    displayName: '其他違規',
    allowedInitialViolatorTypes: violatorTypeList,
    descriptionTemplate: stripIndent(String.raw)`
      > 以下請將各個 <…> 欄位依照指示連同角括號取代為您所提供的內容。
      > 公司法連結：https://goo.gl/b2sscm
      > ACGN股市個人法：https://goo.gl/TRC4jT
      > 請詳細輸入檢舉事由。
      >
      > 我已閱讀完以上注意事項，請將本行以上刪除。

      公司【<請輸入公司名稱>】 *(檢舉對象非公司請將本行刪除)*
      玩家 <請輸入玩家帳號名稱> (識別碼：<請輸入玩家識別碼>) *(檢舉對象非玩家請將本行刪除)*
      涉嫌違規如下：
      <請輸入檢舉事由>
    `
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
