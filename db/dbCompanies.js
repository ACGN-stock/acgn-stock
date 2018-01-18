import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

// 公司資料集
export const dbCompanies = new Mongo.Collection('companies');
export default dbCompanies;

// 公司評等名稱
export const gradeList = ['A', 'B', 'C', 'D'];

// 公司評等係數
export const gradeFactorTable = {
  'miningMachine': {
    A: 0.3,
    B: 0.2,
    C: 0.1,
    D: 0
  },
  'dailyProfit': {
    A: 0.4,
    B: 0.3,
    C: 0.2,
    D: 0.1
  }
};

const schema = new SimpleSchema({
  // 公司名稱
  companyName: {
    type: String,
    min: 1,
    max: 100
  },
  // 總經理userId
  manager: {
    type: String
  },
  // 董事長的稱謂
  chairmanTitle: {
    type: String,
    max: 20,
    defaultValue: '董事長'
  },
  // 董事長userId
  chairman: {
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
  },
  // 違規描述
  illegalReason: {
    type: String,
    max: 10,
    optional: true
  },
  // 資本額
  capital: {
    type: SimpleSchema.Integer,
    min: 0
  },
  // 公司評等
  grade: {
    type: String,
    allowedValues: gradeList,
    defaultValue: _.last(gradeList)
  },
  // 目前總釋出股份
  totalRelease: {
    type: SimpleSchema.Integer,
    min: 0
  },
  // 最後成交價格
  lastPrice: {
    type: SimpleSchema.Integer,
    min: 0
  },
  // 參考每股單價
  listPrice: {
    type: SimpleSchema.Integer,
    min: 0
  },
  // 當季已營利
  profit: {
    type: SimpleSchema.Integer,
    min: 0,
    defaultValue: 0
  },
  // 參考總市值
  totalValue: {
    type: SimpleSchema.Integer,
    min: 0
  },
  // 生產資金
  productionFund: {
    type: SimpleSchema.Integer,
    min: 0
  },
  // 產品的售價上限
  productPriceLimit: {
    type: SimpleSchema.Integer,
    min: 0
  },
  // 選舉經理時的候選者userId列表
  candidateList: {
    type: Array
  },
  'candidateList.$': {
    type: String
  },
  // 選舉經理時的各候選者的支持董事userId列表
  voteList: {
    type: Array
  },
  'voteList.$': [String],
  // 員工每日薪資
  salary: {
    type: SimpleSchema.Integer,
    defaultValue: Meteor.settings.public.defaultCompanySalaryPerDay
  },
  // 下季員工每日薪資
  nextSeasonSalary: {
    type: SimpleSchema.Integer,
    defaultValue: Meteor.settings.public.defaultCompanySalaryPerDay,
    optional: true
  },
  // 員工季末分紅占總營收百分比
  seasonalBonusPercent: {
    type: SimpleSchema.Integer,
    defaultValue: Meteor.settings.public.defaultSeasonalBonusPercent
  },
  // 是否被金管會查封關停
  isSeal: {
    type: Boolean,
    defaultValue: false
  },
  // 公司上市日期
  createdAt: {
    type: Date
  }
});
dbCompanies.attachSchema(schema);

dbCompanies.findByIdOrThrow = function(id, options) {
  const result = dbCompanies.findOne(id, options);

  if (! result) {
    throw new Meteor.Error(404, `找不到識別碼為「${id}」的公司！`);
  }

  return result;
};
