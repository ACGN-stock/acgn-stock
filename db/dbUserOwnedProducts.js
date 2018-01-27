import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

import { dbCompanies } from './dbCompanies';
import { getCurrentSeason } from './dbSeason';

// 使用者持有產品資料集
export const dbUserOwnedProducts = new Mongo.Collection('userOwnedProducts', {
  idGeneration: 'MONGO'
});

const schema = new SimpleSchema({
  // 使用者ID
  userId: {
    type: String
  },
  // 產品ID
  productId: {
    type: String
  },
  // 持有數量
  amount: {
    type: SimpleSchema.Integer,
    min: 1
  },
  // 產品價格
  price: {
    type: SimpleSchema.Integer,
    min: 1
  },
  // 產品公司ID
  companyId: {
    type: String
  },
  // 產品的商業季度ID
  seasonId: {
    type: String
  },
  // 建立時間（最初購買時間）
  createdAt: {
    type: Date
  }
});
dbUserOwnedProducts.attachSchema(schema);

// 取得使用者對公司已使用的購買額度（以當季商品持有總額代表）
export function getSpentProductTradeQuota({ userId, companyId }) {
  const { _id: seasonId } = getCurrentSeason();

  return dbUserOwnedProducts
    .find({ seasonId, companyId, userId }, { fields: { price: 1, amount: 1 } })
    .fetch()
    .reduce((sum, { price, amount }) => {
      return sum + price * amount;
    }, 0);
}

// 取得使用者對公司的剩餘購買額度
export function getAvailableProductTradeQuota({ userId, companyId }) {
  const { capital } = dbCompanies.findOne(companyId, { fields: { capital: 1 } });

  const initialQuota = Math.ceil(capital * 0.1);
  const spentQuota = getSpentProductTradeQuota({ userId, companyId });

  return initialQuota - spentQuota;
}
