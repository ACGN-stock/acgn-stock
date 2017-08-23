'use strict';
import SimpleSchema from 'simpl-schema';
import { Mongo } from 'meteor/mongo';

//使用者財富排行榜
export const dbRankUserWealth = new Mongo.Collection('rankUserWealth', {
  idGeneration: 'MONGO'
});
export default dbRankUserWealth;

//schema
const schema = new SimpleSchema({
  //商業季度
  seasonId: {
    type: String
  },
  //使用者ID
  userId: {
    type: String
  },
  //擁有現金
  money: {
    type: SimpleSchema.Integer
  },
  //持股總價值
  stocksValue: {
    type: SimpleSchema.Integer
  }
});
dbRankUserWealth.attachSchema(schema);
