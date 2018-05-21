import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

// 公司產品投票記錄資料集
export const dbVoteRecord = new Mongo.Collection('voteRecord');
export default dbVoteRecord;

const schema = new SimpleSchema({
  // 公司id
  companyId: {
    type: String
  },
  // 使用者userId
  userId: {
    type: String
  }
});
dbVoteRecord.attachSchema(schema);
