import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';

import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbLog } from '/db/dbLog';
import { dbCompanies } from '/db/dbCompanies';
import { dbEventSchedules } from '/db/dbEventSchedules';
import { dbProducts } from '/db/dbProducts';
import { dbSeason } from '/db/dbSeason';
import { dbUserOwnedProducts } from '/db/dbUserOwnedProducts';

defineMigration({
  version: 17,
  name: 'new product system',
  async up() {
    await Promise.all([
      dbUserOwnedProducts.rawCollection().createIndex({ productId: 1, userId: 1 }, { unique: true }),
      dbUserOwnedProducts.rawCollection().createIndex({ userId: 1, createdAt: 1 }),
      dbUserOwnedProducts.rawCollection().createIndex({ companyId: 1, seasonId: 1 })
    ]);

    // users
    // 改名 vote 為 voteTickets
    await Meteor.users.rawCollection().update({}, { $rename: { 'profile.vote': 'profile.voteTickets' } }, { multi: true });

    // products
    // 改名 votes 為 voteCount
    await dbProducts.rawCollection().update({}, { $rename: { votes: 'voteCount' } }, { multi: true });

    // 廢棄 overdue，改用 state
    const stateOverdueMap = {
      planning: 0,
      marketing: 1,
      ended: 2
    };

    await Promise.all(Object.entries(stateOverdueMap).map(([state, overdue]) => {
      return dbProducts.rawCollection().update({ overdue }, {
        $unset: { overdue: 0 },
        $set: { state }
      }, { multi: true });
    }));

    // 設定所有產品為價格 1、數量 1，並設定庫存與現貨的預設值
    await dbProducts.rawCollection().update({}, {
      $set: {
        price: 1,
        totalAmount: 1,
        stockAmount: 0,
        availableAmount: 0
      }
    }, { multi: true });

    // 記錄過去推薦票造成的營利至 profit 欄位
    await dbProducts.rawCollection().update({}, { $set: { profit: 0 } }, { multi: true }); // 預設值
    const productProfitMap = dbLog
      .aggregate([ {
        $match: { logType: '推薦產品', 'data.profit': { $exists: true } }
      }, {
        $group: { _id: '$data.productId', profit: { $sum: '$data.profit' } }
      } ])
      .reduce((obj, { _id, profit }) => {
        obj[_id] = profit;

        return obj;
      }, {});

    if (! _.isEmpty(productProfitMap)) {
      const productBulk = dbProducts.rawCollection().initializeUnorderedBulkOp();
      Object.entries(productProfitMap).forEach(([productId, profit]) => {
        productBulk.find({ _id: productId }).updateOne({ $set: { profit } });
      });

      return Meteor.wrapAsync(productBulk.execute, productBulk)();
    }

    // companies
    // 給予現存所有公司資本額 70% 為生產資金（扣除待上架總產品數量）、設定售價上限為目前參考價
    const companyUpdateModifierMap = {};
    dbCompanies.find().forEach(({ _id: companyId, listPrice, capital }) => {
      const productCount = dbProducts.find({ state: 'planning', companyId }).count();
      companyUpdateModifierMap[companyId] = {
        $set: {
          productionFund: Math.round(capital * 0.7) - productCount,
          productPriceLimit: listPrice
        }
      };
    });

    if (! _.isEmpty(companyUpdateModifierMap)) {
      const companyBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
      Object.entries(companyUpdateModifierMap).forEach(([companyId, modifier]) => {
        companyBulk.find({ _id: companyId }).updateOne(modifier);
      });
      Meteor.wrapAsync(companyBulk.execute, companyBulk)();
    }

    // 更新 indexes
    await Promise.all([
      dbProducts.rawCollection().dropIndex({ overdue: 1 }),
      dbProducts.rawCollection().dropIndex({ companyId: 1, overdue: 1 }),
      dbProducts.rawCollection().dropIndex({ seasonId: 1, votes: -1 }),
      dbProducts.rawCollection().dropIndex({ companyId: 1, likeCount: -1 })
    ]);
    await Promise.all([
      dbProducts.rawCollection().createIndex({ state: 1 }),
      dbProducts.rawCollection().createIndex({ companyId: 1, state: 1 }),
      dbProducts.rawCollection().createIndex({ seasonId: 1, voteCount: -1 }, {
        partialFilterExpression: { $and: [ { state: 'marketing' }, { state: 'ended' } ] }
      })
    ]);

    // 排程最後出清時間
    const currentSeason = dbSeason.findOne({}, { sort: { beginDate: -1 } });
    if (currentSeason) {
      dbEventSchedules.upsert({ _id: 'product.finalSale' }, {
        $set: {
          scheduledAt: new Date(currentSeason.endDate.getTime() - Meteor.settings.public.productFinalSaleTime)
        }
      });
    }
  }
});
