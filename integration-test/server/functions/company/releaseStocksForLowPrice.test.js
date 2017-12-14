import { resetDatabase } from 'meteor/xolvio:cleaner';
import expect from 'must';
import mustSinon from 'must-sinon';
import { Factory } from 'rosie';

import { dbCompanies } from '/db/dbCompanies';
import { dbOrders } from '/db/dbOrders';
import { dbLog } from '/db/dbLog';
import { dbVariables } from '/db/dbVariables';
import { companyFactory } from '/dev-utils/factories';
import { releaseStocksForLowPrice } from '/server/functions/company/releaseStocksForLowPrice';

mustSinon(expect);

describe('function releaseStocksForLowPrice', function() {
  let companyId;

  const listPrice = 100;
  const totalRelease = 1234;
  const minReleaseAmount = Math.floor(totalRelease * 0.01);
  const maxReleaseAmount = Math.floor(totalRelease * 0.05);
  const upperPriceLimit = Math.ceil(listPrice * 1.30);

  const buyOrderFactory = new Factory()
    .attrs({
      orderType: '購入',
      companyId() {
        return companyId;
      },
      userId: 'someUser',
      unitPrice: upperPriceLimit * upperPriceLimit,
      amount: totalRelease * totalRelease,
      createdAt() {
        return new Date();
      }
    });

  beforeEach(function() {
    resetDatabase();
    dbVariables.set('lowPriceThreshold', listPrice * listPrice);
    companyId = dbCompanies.insert(companyFactory.build({ listPrice, totalRelease }));
  });

  it('should not release stocks if there exists no buy order', function() {
    releaseStocksForLowPrice();
    expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.not.exist();
  });

  it('should not release stocks in non-low-price companies', function() {
    dbVariables.set('lowPriceThreshold', 0);
    dbOrders.insert(buyOrderFactory.build());
    releaseStocksForLowPrice();
    expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.not.exist();
  });

  describe('with enough order amount', function() {
    it('should not release stocks if the buy order price is less than the upper price limit', function() {
      dbOrders.insert(buyOrderFactory.build({ unitPrice: upperPriceLimit - 1 }));
      releaseStocksForLowPrice();
      expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.not.exist();
    });

    it('should release stocks if the buy order price is equal to the upper price limit', function() {
      dbOrders.insert(buyOrderFactory.build({ unitPrice: upperPriceLimit }));
      releaseStocksForLowPrice();
      expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.exist();
    });

    it('should release stocks if the buy order price is more than the upper price limit', function() {
      dbOrders.insert(buyOrderFactory.build({ unitPrice: upperPriceLimit + 1 }));
      releaseStocksForLowPrice();
      expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.exist();
    });
  });

  describe('with enough order price', function() {
    it('should not release stocks if the buy order amount is less than 1% of the total released stocks', function() {
      dbOrders.insert(buyOrderFactory.build({ amount: minReleaseAmount - 1 }));
      releaseStocksForLowPrice();
      expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.not.exist();
    });

    it('should not release stocks if the buy order amount is equal to 1% of the total released stocks', function() {
      dbOrders.insert(buyOrderFactory.build({ amount: minReleaseAmount }));
      releaseStocksForLowPrice();
      expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.not.exist();
    });

    it('should release stocks if the buy order amount is more than 1% of the total released stocks', function() {
      dbOrders.insert(buyOrderFactory.build({ amount: minReleaseAmount + 1 }));
      releaseStocksForLowPrice();
      expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.exist();
    });

    it('should release stocks if the sum of the buy order amounts is more than 1% of the total released stocks', function() {
      dbOrders.insert(buyOrderFactory.build({ amount: minReleaseAmount - 1 }));
      dbOrders.insert(buyOrderFactory.build({ amount: 2 }));
      releaseStocksForLowPrice();
      expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.exist();
    });
  });

  describe('the release amount', function() {
    it('should release at most 5% of the total released stocks', function() {
      dbOrders.insert(buyOrderFactory.build({ amount: totalRelease }));
      releaseStocksForLowPrice();

      const logData = dbLog.findOne({ logType: '公司釋股', companyId });
      logData.data.amount.must.be.equal(maxReleaseAmount);
    });

    it('should release the same amount of stocks as the order amount', function() {
      const amount = Math.floor((minReleaseAmount + maxReleaseAmount) / 2);
      dbOrders.insert(buyOrderFactory.build({ amount }));
      releaseStocksForLowPrice();

      const logData = dbLog.findOne({ logType: '公司釋股', companyId });
      logData.data.amount.must.be.equal(amount);
    });
  });
});
