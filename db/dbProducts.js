import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';
import { translatedMessages } from '/common/imports/utils/schemaHelpers';

// 公司產品資料集
export const dbProducts = new Mongo.Collection('products');

export const productTypeList = [
  '未分類',
  '繪圖',
  'ANSI',
  '影音',
  '文字',
  '三次元'
];

export const productRatingList = [
  '一般向',
  '18禁'
];

export const productStateList = [
  'planning', // 計劃中，等待上架
  'marketing', // 已上架，正在市場上販售
  'ended' // 已過季下架，停止販售
];

export function productStateDescription(state) {
  switch (state) {
    case 'planning':
      return '計劃中';
    case 'marketing':
      return '販售中';
    case 'ended':
      return '已停售';
    default:
      return state;
  }
}

// 產品補貨的基準值方案
export const productReplenishBaseAmountTypeList = [
  'stockAmount',
  'totalAmount'
];

export function productReplenishBaseAmountTypeDisplayName(value) {
  switch (value) {
    case 'stockAmount':
      return '庫存數';
    case 'totalAmount':
      return '總數';
    default:
      return value;
  }
}

// 產品補貨的速度方案
export const productReplenishBatchSizeTypeList = [
  'verySmall',
  'small',
  'medium',
  'large',
  'veryLarge'
];

export function productReplenishBatchSizeTypeDisplayName(value) {
  switch (value) {
    case 'verySmall':
      return '極少量';
    case 'small':
      return '少量';
    case 'medium':
      return '中量';
    case 'large':
      return '大量';
    case 'veryLarge':
      return '極大量';
    default:
      return value;
  }
}

const schema = new SimpleSchema({
  // 公司Id
  companyId: {
    type: String
  },
  // 此產品的狀態
  state: {
    type: String,
    allowedValues: productStateList
  },
  // 販售時的季度ID，於進入 marketing 狀態時更新
  seasonId: {
    type: String,
    optional: true
  },
  // 產品名稱
  productName: {
    label: '產品名稱',
    type: String,
    min: 4,
    max: 255
  },
  // 產品類別
  type: {
    label: '產品類別',
    type: String,
    allowedValues: productTypeList
  },
  // 產品分級
  rating: {
    label: '產品分級',
    type: String,
    allowedValues: productRatingList
  },
  // 產品url
  url: {
    label: '產品連結',
    type: String,
    regEx: SimpleSchema.RegEx.Url
  },
  // 產品描述
  description: {
    label: '產品描述',
    type: String,
    max: 500,
    optional: true
  },
  // 產品售價
  price: {
    label: '產品價格',
    type: SimpleSchema.Integer,
    min: 1
  },
  // 產品發行總數
  totalAmount: {
    label: '產品總數',
    type: SimpleSchema.Integer,
    min: 1
  },
  // 庫存（未上貨架）的產品總數
  stockAmount: {
    type: SimpleSchema.Integer,
    min: 0,
    defaultValue: 0
  },
  // 現貨（可購買）的產品總數
  availableAmount: {
    type: SimpleSchema.Integer,
    min: 0,
    defaultValue: 0
  },
  // 產品補貨的基準值設定
  replenishBaseAmountType: {
    label: '產品補貨基準',
    type: String,
    allowedValues: productReplenishBaseAmountTypeList
  },
  // 產品補貨的批次量大小設定
  replenishBatchSizeType: {
    label: '產品補貨量',
    type: String,
    allowedValues: productReplenishBatchSizeTypeList
  },
  // 產品所貢獻的營利
  profit: {
    type: Number,
    min: 0,
    defaultValue: 0
  },
  // 推薦票的總票數
  voteCount: {
    type: SimpleSchema.Integer,
    defaultValue: 0
  },
  // 建立人 userId
  creator: {
    type: String
  },
  // 建立日期
  createdAt: {
    type: Date
  },
  // 最後更新產品的人 userId（金管會造成的修改除外）
  updatedBy: {
    type: String,
    optional: true
  },
  // 更新日期（金管會造成的修改除外）
  updatedAt: {
    type: Date,
    optional: true
  }
});
schema.messageBox.setLanguage('zh-tw');
schema.messageBox.messages(translatedMessages);

dbProducts.attachSchema(schema);

dbProducts.findByIdOrThrow = function(id, options) {
  const result = this.findOne(id, options);
  if (! result) {
    throw new Meteor.Error(404, `找不到識別碼為「${id}」的產品！`);
  }

  return result;
};
