import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

import { dbProducts } from './dbProducts';
import { dbVariables } from './dbVariables';

// 公司資料集
export const dbCompanies = new Mongo.Collection('companies');

// 公司評等名稱
export const gradeNameList = ['S', 'A', 'B', 'C', 'D'];

// 公司評等排名切分比例
export const gradeProportionMap = {
  S: 0.05,
  A: 0.25,
  B: 0.50,
  C: 0.75,
  D: 1.00
};

// 公司評等係數
export const gradeFactorTable = {
  // 挖礦機獲利係數
  'miningMachine': {
    S: 0.4,
    A: 0.3,
    B: 0.2,
    C: 0.1,
    D: 0
  },
  // 員工獲利係數
  'dailyProfit': {
    S: 0.4,
    A: 0.4,
    B: 0.3,
    C: 0.2,
    D: 0.1
  }
};

// 取得公司計劃上架的產品
export function getPlanningProducts(companyData, options = {}) {
  return dbProducts.find({ companyId: companyData._id, state: 'planning' }, options);
}

// 取得公司的總生產資金
export function getTotalProductionFund(companyData) {
  return Math.round(companyData.capital * 0.7 + companyData.baseProductionFund);
}

// 取得公司已使用的生產資金
export function getUsedProductionFund(companyData) {
  return getPlanningProducts(companyData, { fields: { price: 1, totalAmount: 1 } })
    .fetch()
    .reduce((sum, { price, totalAmount }) => {
      return sum + price * totalAmount;
    }, 0);
}

// 取得公司剩餘可用的生產資金
export function getAvailableProductionFund(companyData) {
  return getTotalProductionFund(companyData) - getUsedProductionFund(companyData);
}

// 判斷是否為低價公司
export function isLowPriceCompany(companyData) {
  const lowPriceThreshold = dbVariables.get('lowPriceThreshold');

  return companyData.listPrice < lowPriceThreshold;
}

// 判斷是否為高價公司
export function isHighPriceCompany(companyData) {
  const highPriceThreshold = dbVariables.get('highPriceThreshold');

  return companyData.listPrice >= highPriceThreshold;
}

/**
 * @typedef {Object} UpperAndLower
 * @property {Number} upper
 * @property {Number} lower
 */
/**
 * 取得買賣單的上下限
 * @param {Object} companyData 計算上下限所需的資訊
 * @param {Number} companyData.listPrice listPrice
 * @param {Number} companyData.capital capital
 * @param {Number} companyData.totalValue totalValue
 * @param {Date} companyData.createdAt createdAt
 * @returns {UpperAndLower} { upper, lower }
 */
export function getPriceLimits(companyData) {
  const upper = getPriceUpperLimit(companyData);
  const lower = getPriceLowerLimit(companyData);

  return { upper, lower };
}

function getPriceUpperLimit(companyData) {
  const priceLimits = Meteor.settings.public.priceLimits;
  let upperPrice;
  if (isLowPriceCompany(companyData)) {
    upperPrice = companyData.listPrice * priceLimits.lowPriceCompany.upper;
  }
  else {
    upperPrice = companyData.listPrice * priceLimits.normal.upper;
  }

  upperPrice = Math.max(upperPrice, getFairPrice(companyData));

  return Math.ceil(upperPrice);
}

function getPriceLowerLimit(companyData) {
  const priceLimits = Meteor.settings.public.priceLimits;
  let lowerPrice;
  if (isFirstStageValueLowerThanCapitalCompany(companyData)) {
    lowerPrice = companyData.listPrice * priceLimits.firstStageValueLowerThanCapitalCompany.lower;
  }
  else if (isSecondStageValueLowerThanCapitalCompany(companyData)) {
    lowerPrice = companyData.listPrice * priceLimits.secondStageValueLowerThanCapitalCompany.lower;
  }
  else {
    lowerPrice = companyData.listPrice * priceLimits.normal.lower;
  }

  return Math.max(Math.floor(lowerPrice), 1);
}

// 公允價格
function getFairPrice({ totalValue, listPrice, capital }) {
  const totalRelease = totalValue / listPrice;

  return Math.ceil(capital / totalRelease);
}

function isValueLowerThanCapital(companyData) {
  return companyData.totalValue < companyData.capital;
}

function isFirstStageValueLowerThanCapitalCompany(companyData) {
  const firstStageTime = Meteor.settings.public.valueLowerThanCapitalCompanyFallLimitTimes.firstStageTime;
  const createdTime = Date.now() - companyData.createdAt.getTime();
  if (createdTime < firstStageTime) {
    return isValueLowerThanCapital(companyData);
  }
  else {
    return false;
  }
}

function isSecondStageValueLowerThanCapitalCompany(companyData) {
  const secondStageTime = Meteor.settings.public.valueLowerThanCapitalCompanyFallLimitTimes.secondStageTime;
  const createdTime = Date.now() - companyData.createdAt.getTime();
  if (createdTime < secondStageTime) {
    return isValueLowerThanCapital(companyData);
  }
  else {
    return false;
  }
}


const schema = new SimpleSchema({
  // 公司名稱
  companyName: {
    type: String,
    min: 1,
    max: 100
  },
  // 創立者 userId
  founder: {
    type: String
  },
  // 經理人 userId
  manager: {
    type: String
  },
  // 董事長的稱謂
  chairmanTitle: {
    type: String,
    max: 20,
    defaultValue: '董事長'
  },
  // 董事長 userId
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
    allowedValues: gradeNameList,
    defaultValue: _.last(gradeNameList)
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
    type: Number,
    min: 0,
    defaultValue: 0
  },
  // 參考總市值
  totalValue: {
    type: SimpleSchema.Integer,
    min: 0
  },
  // 基礎生產資金
  baseProductionFund: {
    type: SimpleSchema.Integer,
    min: 0,
    defaultValue: 0
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
  // 經理分紅佔比
  managerBonusRatePercent: {
    type: Number,
    defaultValue: Meteor.settings.public.companyProfitDistribution.managerBonusRatePercent.default
  },
  // 員工分紅佔比
  employeeBonusRatePercent: {
    type: Number,
    defaultValue: Meteor.settings.public.companyProfitDistribution.employeeBonusRatePercent.default
  },
  // 營利投入資本額佔比
  capitalIncreaseRatePercent: {
    type: Number,
    defaultValue: Meteor.settings.public.companyProfitDistribution.capitalIncreaseRatePercent.default
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
