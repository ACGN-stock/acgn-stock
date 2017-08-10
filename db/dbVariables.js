'use strict';
import { Mongo } from 'meteor/mongo';

//公司產品資料集
export const dbVariables = new Mongo.Collection('variables');
export default dbVariables;

dbVariables.initialized = function initialized() {
  return !! this.findOne();
};
dbVariables.get = function get(variableName) {
  const variableData = this.findOne(variableName);

  return variableData ? variableData.value : null;
};
dbVariables.set = function set(variableName, value) {
  this.upsert(variableName, {value});
};
