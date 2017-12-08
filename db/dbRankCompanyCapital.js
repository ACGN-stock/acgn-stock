import SimpleSchema from 'simpl-schema';
import { Mongo } from 'meteor/mongo';

// 公司資本額排行榜
export const dbRankCompanyCapital = new Mongo.Collection('rankCompanyCapital', { idGeneration: 'MONGO' });

const schema = new SimpleSchema({
  // 商業季度
  seasonId: {
    type: String
  },
  // 公司ID
  companyId: {
    type: String
  },
  // 資本額
  capital: {
    type: SimpleSchema.Integer
  },
  // 總釋出股票
  totalRelease: {
    type: SimpleSchema.Integer
  },
  // 參考總市值
  totalValue: {
    type: SimpleSchema.Integer
  }
});
dbRankCompanyCapital.attachSchema(schema);
