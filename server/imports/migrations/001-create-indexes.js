import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbLog } from '/db/dbLog';
import { dbAdvertising } from '/db/dbAdvertising';
import { dbCompanies } from '/db/dbCompanies';
import { dbDirectors } from '/db/dbDirectors';
import { dbFoundations } from '/db/dbFoundations';
import { dbOrders } from '/db/dbOrders';
import { dbPrice } from '/db/dbPrice';
import { dbProducts } from '/db/dbProducts';
import { dbRankCompanyPrice } from '/db/dbRankCompanyPrice';
import { dbRankCompanyProfit } from '/db/dbRankCompanyProfit';
import { dbRankCompanyValue } from '/db/dbRankCompanyValue';
import { dbRankUserWealth } from '/db/dbRankUserWealth';
import { dbSeason } from '/db/dbSeason';
import { dbValidatingUsers } from '/db/dbValidatingUsers';
import { dbVoteRecord } from '/db/dbVoteRecord';

defineMigration({
  version: 1,
  name: 'create indexes',
  async up() {
    await Promise.all([
      dbAdvertising.rawCollection().createIndex({ paid: -1 }),
      dbCompanies.rawCollection().createIndex({ companyName: 1 }),
      dbCompanies.rawCollection().createIndex({ lastPrice: -1 }, {
        partialFilterExpression: { isSeal: false }
      }),
      dbCompanies.rawCollection().createIndex({ listPrice: -1 }, {
        partialFilterExpression: { isSeal: false }
      }),
      dbCompanies.rawCollection().createIndex({ totalValue: -1 }, {
        partialFilterExpression: { isSeal: false }
      }),
      dbCompanies.rawCollection().createIndex({ profit: -1 }, {
        partialFilterExpression: { isSeal: false }
      }),
      dbCompanies.rawCollection().createIndex({ createdAt: -1 }, {
        partialFilterExpression: { isSeal: false }
      }),
      dbCompanies.rawCollection().createIndex({ manager: 1 }, {
        partialFilterExpression: { isSeal: false }
      }),
      dbDirectors.rawCollection().createIndex({ companyId: 1, stocks: -1, createdAt: 1 }),
      dbDirectors.rawCollection().createIndex({ companyId: 1, userId: 1 }, { unique: true }),
      dbDirectors.rawCollection().createIndex({ userId: 1 }),
      dbFoundations.rawCollection().createIndex({ companyName: 1 }),
      dbFoundations.rawCollection().createIndex({ createdAt: 1 }),
      dbLog.rawCollection().createIndex({ createdAt: -1 }),
      dbLog.rawCollection().createIndex({ companyId: 1, createdAt: -1 }),
      dbLog.rawCollection().createIndex({ userId: 1, createdAt: -1 }),
      dbOrders.rawCollection().createIndex({ companyId: 1, userId: 1 }),
      dbOrders.rawCollection().createIndex({ companyId: 1, unitPrice: -1, createdAt: 1 }, {
        partialFilterExpression: { orderType: '購入' }
      }),
      dbOrders.rawCollection().createIndex({ companyId: 1, unitPrice: 1, createdAt: 1 }, {
        partialFilterExpression: { orderType: '賣出' }
      }),
      dbOrders.rawCollection().createIndex({ userId: 1 }),
      dbPrice.rawCollection().createIndex({ companyId: 1, createdAt: -1 }),
      dbPrice.rawCollection().createIndex({ createdAt: 1 }),
      dbProducts.rawCollection().createIndex({ overdue: 1 }),
      dbProducts.rawCollection().createIndex({ companyId: 1, overdue: 1 }),
      dbProducts.rawCollection().createIndex({ seasonId: 1, votes: -1 }, {
        partialFilterExpression: { overdue: { $gt: 0 } }
      }),
      dbProducts.rawCollection().createIndex({ companyId: 1, likeCount: -1 }, {
        partialFilterExpression: { overdue: { $gt: 0 } }
      }),
      dbRankCompanyPrice.rawCollection().createIndex({ season: 1 }),
      dbRankCompanyProfit.rawCollection().createIndex({ season: 1 }),
      dbRankCompanyValue.rawCollection().createIndex({ season: 1 }),
      dbRankUserWealth.rawCollection().createIndex({ season: 1 }),
      dbSeason.rawCollection().createIndex({ beginDate: -1 }),
      dbValidatingUsers.rawCollection().createIndex({ username: 1 }),
      dbVoteRecord.rawCollection().createIndex({ companyId: 1, userId: 1 }, { unique: true })
    ]);
  }
});
