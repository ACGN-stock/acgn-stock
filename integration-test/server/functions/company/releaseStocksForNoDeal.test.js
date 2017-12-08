import { resetDatabase } from 'meteor/xolvio:cleaner';
import expect from 'must';
import mustSinon from 'must-sinon';
import { Factory } from 'rosie';

import { dbCompanies } from '/db/dbCompanies';
import { dbOrders } from '/db/dbOrders';
import { dbLog } from '/db/dbLog';
import { dbVariables } from '/db/dbVariables';
import { companyFactory } from '/dev-utils/factories';
import { releaseStocksForNoDeal } from '/server/functions/company/releaseStocksForNoDeal';

mustSinon(expect);

describe('function releaseStocksForNoDeal', function() {
  let companyId;

  const listPrice = 100;
  const totalRelease = 1000;
  const upperPriceLimit = Math.ceil(listPrice * 1.15);

  const buyOrderFactory = new Factory()
    .attrs({
      orderType: '購入',
      companyId() {
        return companyId;
      },
      userId: 'someUser',
      unitPrice: upperPriceLimit,
      amount: 1,
      createdAt() {
        return new Date();
      }
    });

  beforeEach(function() {
    resetDatabase();
    companyId = dbCompanies.insert(companyFactory.build({ listPrice, totalRelease }));
  });

  it('should not release stocks if there exists no buy order', function() {
    releaseStocksForNoDeal();
    expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.not.exist();
  });

  describe('with no recent trade volume', function() {
    it('should not release stocks if the buy order price is less than the upper price limit', function() {
      dbOrders.insert(buyOrderFactory.build({ unitPrice: upperPriceLimit - 1 }));
      releaseStocksForNoDeal();
      expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.not.exist();
    });

    it('should release stocks if the buy order price is equal to the upper price limit', function() {
      dbOrders.insert(buyOrderFactory.build({ unitPrice: upperPriceLimit }));
      releaseStocksForNoDeal();
      expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.exist();
    });

    it('should release stocks if the buy order price is more than the upper price limit', function() {
      dbOrders.insert(buyOrderFactory.build({ unitPrice: upperPriceLimit + 1 }));
      releaseStocksForNoDeal();
      expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.exist();
    });

    describe('with a low price company', function() {
      const lowPriceCompanyUpperPriceLimit = Math.ceil(listPrice * 1.30);

      beforeEach(function() {
        dbVariables.set('lowPriceThreshold', listPrice * listPrice);
      });

      it('should not release stocks if the buy order price is less than the low-price-company upper price limit', function() {
        dbOrders.insert(buyOrderFactory.build({ unitPrice: lowPriceCompanyUpperPriceLimit - 1 }));
        releaseStocksForNoDeal();
        expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.not.exist();
      });

      it('should release stocks if the buy order price is equal to the low-price-company upper price limit', function() {
        dbOrders.insert(buyOrderFactory.build({ unitPrice: lowPriceCompanyUpperPriceLimit }));
        releaseStocksForNoDeal();
        expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.exist();
      });

      it('should release stocks if the buy order price is more than the low-price-company upper price limit', function() {
        dbOrders.insert(buyOrderFactory.build({ unitPrice: lowPriceCompanyUpperPriceLimit + 1 }));
        releaseStocksForNoDeal();
        expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.exist();
      });
    });
  });

  describe('with a recent trade volume', function() {
    const volume = 100;
    const amountThreshold = volume * 10;

    beforeEach(function() {
      dbLog.insert({
        logType: '交易紀錄',
        companyId,
        userId: ['user1', 'user2'],
        data: {
          amount: volume,
          price: 1
        },
        createdAt: new Date()
      });
    });

    it('should not release stocks if the order amount is less than the amount threshold', function() {
      dbOrders.insert(buyOrderFactory.build({ amount: amountThreshold - 1 }));
      releaseStocksForNoDeal();
      expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.not.exist();
    });

    it('should not release stocks if the order amount is equal to the amount threshold', function() {
      dbOrders.insert(buyOrderFactory.build({ amount: amountThreshold }));
      releaseStocksForNoDeal();
      expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.not.exist();
    });

    it('should release stocks if the order amount is more than the amount threshold', function() {
      dbOrders.insert(buyOrderFactory.build({ amount: amountThreshold + 1 }));
      releaseStocksForNoDeal();
      expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.exist();
    });

    it('should release stocks if the sum of the upper-price-limit order amounts is more than the amount threshold', function() {
      dbOrders.insert(buyOrderFactory.build({ amount: amountThreshold - 1 }));
      dbOrders.insert(buyOrderFactory.build({ amount: 2 }));
      releaseStocksForNoDeal();
      expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.exist();
    });
  });
});
