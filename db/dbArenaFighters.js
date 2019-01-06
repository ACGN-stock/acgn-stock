import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

// 最萌亂鬥大賽報名公司資料集
export const dbArenaFighters = new Mongo.Collection('arenaFighters');

export const MAX_MANNER_SIZE = 3;

export const arenaFighterAttributeNameList = ['hp', 'sp', 'atk', 'def', 'agi'];

export const arenaFighterSortableFields = [
  'hp', 'sp', 'atk', 'def', 'agi', 'rank', 'totalInvestedAmount'
];

const attributeParameters = {
  hp: { cost: 200, base: 100 },
  sp: { cost: 1000, base: 10 },
  atk: { cost: 1000, base: 20 },
  def: { cost: 1000, base: 5 },
  agi: { cost: 1000, base: 0 }
};

export function getAttributeNumber(attribute, amount) {
  const { cost, base } = attributeParameters[attribute];

  return base + Math.floor(amount / cost);
}

const schema = new SimpleSchema({
  // 對應的大賽id
  arenaId: {
    type: String
  },
  // 公司ID
  companyId: {
    type: String
  },
  // 報名截止時，該報名角色的經理userId(決定該次大賽戰鬥時決策的經理userId)
  manager: {
    type: String,
    optional: true
  },
  // 亂鬥名次（於亂鬥結束時產生）
  rank: {
    type: SimpleSchema.Integer,
    optional: true
  },
  // 總投資額
  totalInvestedAmount: {
    type: SimpleSchema.Integer,
    defaultValue: 0
  },
  // 目前已投資在hp屬性上的總資金量
  hp: {
    type: SimpleSchema.Integer,
    defaultValue: 0
  },
  // 目前已投資在sp屬性上的總資金量
  sp: {
    type: SimpleSchema.Integer,
    defaultValue: 0
  },
  // 目前已投資在atk屬性上的總資金量
  atk: {
    type: SimpleSchema.Integer,
    defaultValue: 0
  },
  // 目前已投資在def屬性上的總資金量
  def: {
    type: SimpleSchema.Integer,
    defaultValue: 0
  },
  // 目前已投資在agi屬性上的總資金量
  agi: {
    type: SimpleSchema.Integer,
    defaultValue: 0
  },
  // 投資人列表
  investors: {
    type: Array,
    defaultValue: [],
    optional: true
  },
  'investors.$': {
    type: new SimpleSchema({
      userId: {
        type: String
      },
      amount: {
        type: SimpleSchema.Integer,
        min: 1
      }
    })
  },
  // 公司上市日期，在agi相等時排列攻擊順序使用
  createdAt: {
    type: Date
  },
  // 特攻消耗數值
  spCost: {
    type: SimpleSchema.Integer,
    defaultValue: 5,
    min: 1
  },
  // 攻擊優先順序，對應dbArena資料集中的shuffledFighterCompanyIdList陣列的index
  attackSequence: {
    type: Array,
    defaultValue: []
  },
  'attackSequence.$': SimpleSchema.Integer,
  // 一般攻擊招式表
  normalManner: {
    type: Array,
    maxCount: MAX_MANNER_SIZE,
    defaultValue: []
  },
  'normalManner.$': {
    type: String,
    min: 1,
    max: 150
  },
  // 特殊攻擊招式表
  specialManner: {
    type: Array,
    maxCount: MAX_MANNER_SIZE,
    defaultValue: []
  },
  'specialManner.$': {
    type: String,
    min: 1,
    max: 150
  }
});
dbArenaFighters.attachSchema(schema);
