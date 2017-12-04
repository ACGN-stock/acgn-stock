'use strict';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

//最萌亂鬥大賽紀錄資料集
export const dbArenaLog = new Mongo.Collection('arenaLog', {
  idGeneration: 'MONGO'
});
export default dbArenaLog;

const schema = new SimpleSchema({
  //對應的大賽id
  arenaId: {
    type: String
  },
  //紀錄的順序
  sequence: {
    type: SimpleSchema.Integer
  },
  //紀錄的回合數
  round: {
    type: SimpleSchema.Integer
  },
  //紀錄相關的公司ID陣列, 0為攻擊者, 1為防禦者
  companyId: {
    type: Array
  },
  'companyId.$': {
    type: String
  },
  //紀錄攻擊者使用的招式index，正數-1對應dbArenaFighters資料集的normalManner陣列index，負數+1對應specialManner的陣列index
  attackManner: {
    type: SimpleSchema.Integer
  },
  //紀錄當次攻擊動作造成的傷害，0為未命中
  damage: {
    type: SimpleSchema.Integer
  },
  //紀錄攻擊者發動攻擊時的sp
  attackerSp: {
    type: SimpleSchema.Integer
  },
  //紀錄防禦者被攻擊後的hp
  defenderHp: {
    type: SimpleSchema.Integer
  },
  //紀錄若防禦者被擊倒，攻擊者得到的收益
  profit: {
    type: SimpleSchema.Integer,
    optional: true
  }
});
dbArenaLog.attachSchema(schema);
