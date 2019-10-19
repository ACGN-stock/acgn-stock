import { resetDatabase } from 'meteor/xolvio:cleaner';
import expect from 'must';
import mustSinon from 'must-sinon';

import { dbCompanies, getPriceLimits } from '/db/dbCompanies';
import { dbOrders } from '/db/dbOrders';
import { dbLog } from '/db/dbLog';
import { dbVariables } from '/db/dbVariables';
import { companyFactory } from '/dev-utils/factories';
import { releaseStocksForHighPrice } from '/server/functions/company/releaseStocksForHighPrice';

mustSinon(expect);

describe('function releaseStocksForHighPrice', function() {
  this.timeout(10000);

  let companyId;
  const lastPrice = 1000;

  beforeEach(function() {
    resetDatabase();
    dbVariables.set('highPriceThreshold', 0);
    companyId = dbCompanies.insert(companyFactory.build({ lastPrice, totalRelease: 1000 }));
  });

  it('should not release stocks if the company is not a high price company', function() {
    dbVariables.set('highPriceThreshold', lastPrice + 1);
    releaseStocksForHighPrice();
    dbOrders.find({}).count().must.be.equal(0);
  });

  it('should create a !system sell order', function() {
    const beforeCompanyData = dbCompanies.findOne(companyId);

    releaseStocksForHighPrice();

    const companyData = dbCompanies.findOne(companyId);
    const { totalRelease } = companyData;

    const orderData = dbOrders.findOne({
      orderType: '賣出',
      userId: '!system',
      companyId
    });

    expect(orderData).to.exist();
    companyData.listPrice.must.be.equal(companyData.lastPrice); // 應更新股價
    orderData.unitPrice.must.be.equal(getPriceLimits(beforeCompanyData).upper); // 漲停價
    orderData.amount.must.be.between(1, Math.floor(Math.sqrt(totalRelease)));

    const logData = dbLog.findOne({ logType: '公司釋股', companyId });
    expect(logData).to.exist();
    logData.data.must.be.eql({
      price: orderData.unitPrice,
      amount: orderData.amount
    });
  });

  it('should not create !system sell orders if there already exists any', function() {
    dbOrders.insert({
      orderType: '賣出',
      userId: '!system',
      companyId,
      unitPrice: 1,
      amount: 1,
      createdAt: new Date()
    });

    const orderCount = dbOrders.find({}).count();
    releaseStocksForHighPrice();
    dbOrders.find({}).count().must.be.equal(orderCount);
  });
});
