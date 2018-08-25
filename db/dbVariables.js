import { Mongo } from 'meteor/mongo';

// 任意變數資料集
export const dbVariables = new Mongo.Collection('variables');
export default dbVariables;

dbVariables.initialized = function() {
  return !! this.findOne();
};

dbVariables.get = function(key) {
  const variableData = this.findOne(key);

  return variableData ? variableData.value : null;
};

dbVariables.set = function(key, value) {
  this.upsert(key, { value });
};

dbVariables.has = function(key) {
  return !! this.findOne(key);
};

dbVariables.setIfNotFound = function(key, value) {
  if (! this.has(key)) {
    this.set(key, value);
  }
};
