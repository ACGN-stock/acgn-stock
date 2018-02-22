import { _ } from 'meteor/underscore';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import expect from 'must';
import mustSinon from 'must-sinon';

import { dbCompanies } from '/db/dbCompanies';
import { dbDirectors } from '/db/dbDirectors';
import { dbOrders } from '/db/dbOrders';
import { companyFactory } from '/dev-utils/factories';
import { sellFscStocks } from '/server/functions/company/sellFscStocks';

mustSinon(expect);

describe('function sellFscStocks', function() {
  this.timeout(10000);

  beforeEach(function() {
    resetDatabase();
  });

  it('should create orders of the user !FSC', function() {
    const fscStocksList = [
      250, 200, 101, // > 100
      100, 50, 10, // between 100 and 10
      9, 5, 1 // < 10
    ];
    const expectedAmountList = [
      25, 20, 11, // ceil(stocks * 0.1)
      10, 10, 10, // 10
      9, 5, 1 // all remaining stocks
    ];

    const companyIds = companyFactory.buildList(fscStocksList.length, { listPrice: 100 }).map((companyData) => {
      return dbCompanies.insert(companyData);
    });

    _.zip(companyIds, fscStocksList).forEach(([companyId, stocks]) => {
      dbDirectors.insert({ userId: '!FSC', companyId, stocks, createdAt: new Date() });
    });

    sellFscStocks();

    const orderAmountList = companyIds.map((companyId) => {
      return dbOrders.findOne({ userId: '!FSC', companyId, orderType: '賣出' }).amount;
    });

    orderAmountList.must.be.eql(expectedAmountList);
  });
});
