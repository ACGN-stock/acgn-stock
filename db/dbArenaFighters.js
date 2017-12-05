'use strict';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

//最萌亂鬥大賽報名公司資料集
export const dbArenaFighters = new Mongo.Collection('arenaFighters');
export default dbArenaFighters;

export const MAX_MANNER_SIZE = 3;

export function getAttributeNumber(attribute, amount) {
  switch (attribute) {
    case 'hp': {
      return Math.floor(amount / 200) + 50;
    }
    case 'sp': {
      return Math.floor(amount / 1000) + 5;
    }
    case 'atk': {
      return Math.floor(amount / 1000) + 1;
    }
    default: {
      return Math.floor(amount / 1000);
    }
  }
}

//schema
const schema = new SimpleSchema({
  //對應的大賽id
  arenaId: {
    type: String
  },
  //公司ID
  companyId: {
    type: String
  },
  //報名截止時，該報名角色的經理userId(決定該次大賽戰鬥時決策的經理userId)
  manager: {
    type: String,
    optional: true
  },
  //目前已投資在hp屬性上的總資金量
  hp: {
    type: SimpleSchema.Integer,
    defaultValue: 0
  },
  //目前已投資在sp屬性上的總資金量
  sp: {
    type: SimpleSchema.Integer,
    defaultValue: 0
  },
  //目前已投資在atk屬性上的總資金量
  atk: {
    type: SimpleSchema.Integer,
    defaultValue: 0
  },
  //目前已投資在def屬性上的總資金量
  def: {
    type: SimpleSchema.Integer,
    defaultValue: 0
  },
  //目前已投資在agi屬性上的總資金量
  agi: {
    type: SimpleSchema.Integer,
    defaultValue: 0
  },
  //公司上市日期，在agi相等時排列攻擊順序使用
  createdAt: {
    type: Date
  },
  //特攻消耗數值
  spCost: {
    type: SimpleSchema.Integer,
    defaultValue: 5,
    min: 1
  },
  //攻擊優先順序，對應dbArena資料集中的shuffledFighterCompanyIdList陣列的index
  shuffledFighterCompanyIdList: {
    type: Array,
    defaultValue: []
  },
  'shuffledFighterCompanyIdList.$': SimpleSchema.Integer,
  //一般攻擊招式表
  normalManner: {
    type: Array,
    maxCount: MAX_MANNER_SIZE,
    defaultValue: []
  },
  'normalManner.$': String,
  //特殊攻擊招式表
  specialManner: {
    type: Array,
    maxCount: MAX_MANNER_SIZE,
    defaultValue: []
  },
  'specialManner.$': String
});
dbArenaFighters.attachSchema(schema);
