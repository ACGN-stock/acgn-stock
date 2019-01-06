import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { dbArena } from './dbArena';
// import SimpleSchema from 'simpl-schema';

// 最萌亂鬥大賽紀錄資料集
const collectionHash = {};
export const dbArenaLog = {
  getCollectionName(arenaId) {
    return `arenaLog${arenaId}`;
  },
  getCollection(arenaId) {
    if (! collectionHash[arenaId]) {
      const collectionName = this.getCollectionName(arenaId);
      const collection = new Mongo.Collection(collectionName, {
        idGeneration: 'MONGO'
      });
      // 加schema好像沒啥意義?  Bulk insert的不會被SimpleSchema檢查到
      // collection.attachSchema(schema);
      if (Meteor.isServer) {
        collection.rawCollection().createIndex({ sequence: 1 }, { unique: true });
      }
      collectionHash[arenaId] = collection;
    }

    return collectionHash[arenaId];
  },
  getBulk(arenaId) {
    const collection = this.getCollection(arenaId);

    return collection.rawCollection().initializeUnorderedBulkOp();
  },
  find(arenaId, filter = {}, options = {}) {
    return this.getCollection(arenaId).find(filter, options);
  },
  dropAll() {
    dbArena.find().forEach((arenaData) => {
      const arenaId = arenaData._id;
      const collection = this.getCollection(arenaId);

      collection.rawCollection().drop();
      collectionHash[arenaId] = null;
    });
  }
};

// const schema = new SimpleSchema({
//   //紀錄的順序
//   sequence: {
//     type: SimpleSchema.Integer
//   },
//   //紀錄的回合數
//   round: {
//     type: SimpleSchema.Integer
//   },
//   //紀錄相關的公司ID陣列, 0為攻擊者, 1為防禦者
//   companyId: {
//     type: Array
//   },
//   'companyId.$': {
//     type: String
//   },
//   //紀錄攻擊者使用的招式index，正數-1對應dbArenaFighters資料集的normalManner陣列index，負數+1對應specialManner的陣列index
//   attackManner: {
//     type: SimpleSchema.Integer
//   },
//   //紀錄當次攻擊動作造成的傷害，0為未命中
//   damage: {
//     type: SimpleSchema.Integer
//   },
//   //紀錄攻擊者發動攻擊時的sp
//   attackerSp: {
//     type: SimpleSchema.Integer
//   },
//   //紀錄防禦者被攻擊後的hp
//   defenderHp: {
//     type: SimpleSchema.Integer
//   },
//   //紀錄若防禦者被擊倒，攻擊者得到的收益
//   profit: {
//     type: Number,
//     optional: true
//   }
// });
