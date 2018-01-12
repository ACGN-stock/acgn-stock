import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

// 公司產品資料集
export const dbProducts = new Mongo.Collection('products');
export default dbProducts;

export const productTypeList = [
  '繪圖',
  'ANSI',
  '影音',
  '文字',
  '三次元',
  '裏物'
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
    type: String,
    min: 4,
    max: 255
  },
  // 產品類別
  type: {
    type: String,
    allowedValues: productTypeList
  },
  // 產品url
  url: {
    type: String,
    regEx: SimpleSchema.RegEx.Url
  },
  // 產品描述
  description: {
    type: String,
    max: 500,
    optional: true
  },
  // 產品售價
  price: {
    type: SimpleSchema.Integer,
    min: 1
  },
  // 產品發行總數
  totalAmount: {
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
  // 產品所貢獻的營利
  profit: {
    type: SimpleSchema.Integer,
    min: 0,
    defaultValue: 0
  },
  // 推薦票的總票數
  voteCount: {
    type: SimpleSchema.Integer,
    defaultValue: 0
  },
  // 建立日期
  createdAt: {
    type: Date
  }
});
dbProducts.attachSchema(schema);

dbProducts.findByIdOrThrow = function(id, options) {
  const result = this.findOne(id, options);
  if (! result) {
    throw new Meteor.Error(404, `找不到識別碼為「${id}」的產品！`);
  }

  return result;
};
