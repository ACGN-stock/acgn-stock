import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import expect from 'must';
import sinon from 'sinon';
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
  this.timeout(10000);

  let companyId;

  const defaultListPrice = 100;
  const defaultTotalRelease = 1000;
  const defaultCreatedAt = new Date(0);
  const defaultUpperPriceLimit = Math.ceil(defaultListPrice * Meteor.settings.public.priceLimits.normal.upper);

  const buyOrderFactory = new Factory()
    .attrs({
      orderType: '購入',
      companyId() {
        return companyId;
      },
      userId: 'someUser',
      amount: defaultTotalRelease ** 2,
      unitPrice: defaultUpperPriceLimit + 1,
      createdAt() {
        return new Date();
      }
    });

  let clock;

  beforeEach(function() {
    resetDatabase();
  });

  beforeEach(function() {
    resetDatabase();
    clock = sinon.useFakeTimers(new Date());
    companyId = dbCompanies.insert(companyFactory.build({
      listPrice: defaultListPrice,
      totalRelease: defaultTotalRelease,
      createdAt: defaultCreatedAt
    }));
  });

  afterEach(function() {
    clock.restore();
  });

  it('should release stocks', function() {
    dbOrders.insert(buyOrderFactory.build());

    releaseStocksForNoDeal();

    const companyData = dbCompanies.findOne(companyId);
    companyData.listPrice.must.be.equal(companyData.lastPrice);
    expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.exist();
  });

  it('should not release stocks if there exists no buy order', function() {
    releaseStocksForNoDeal();
    expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.not.exist();
  });

  describe('price threshold', function() {
    function runTests({ upperPriceLimit }) {
      it('should not release stocks if the buy order price is less than the upper price limit', function() {
        dbOrders.insert(buyOrderFactory.build({ unitPrice: upperPriceLimit - 1 }));
        releaseStocksForNoDeal();
        expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.not.exist();
      });

      it('should release stocks if the buy order price is at least the upper price limit', function() {
        dbOrders.insert(buyOrderFactory.build({ unitPrice: upperPriceLimit }));
        releaseStocksForNoDeal();
        expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.exist();
      });
    }

    describe('with normal company', function() {
      runTests({ upperPriceLimit: Math.ceil(defaultListPrice * Meteor.settings.public.priceLimits.normal.upper) });
    });

    describe('with low-price company', function() {
      beforeEach(function() {
        dbVariables.set('lowPriceThreshold', defaultListPrice + 1);
      });

      runTests({ upperPriceLimit: Math.ceil(defaultListPrice * Meteor.settings.public.priceLimits.lowPriceCompany.upper) });
    });
  });

  describe('amount threshold', function() {
    const { releaseStocksForNoDealTradeLogLookbackIntervalTime: lookbackTime } = Meteor.settings.public;

    function runTests({ isNewCompany, recentTradeVolume }) {
      const amountThreshold = 10 * (recentTradeVolume + (isNewCompany ? defaultTotalRelease : 0));

      beforeEach(function() {
        if (isNewCompany) {
          dbCompanies.update(companyId, { $set: { createdAt: new Date(Date.now() - lookbackTime + 1) } });
        }

        if (recentTradeVolume) {
          dbLog.insert({
            logType: '交易紀錄',
            companyId,
            userId: ['user1', 'user2'],
            data: {
              amount: recentTradeVolume,
              price: 1
            },
            createdAt: new Date()
          });
        }
      });

      if (amountThreshold > 0) {
        it('should not release stocks if the order amount is at most the amount threshold', function() {
          dbOrders.insert(buyOrderFactory.build({ amount: amountThreshold }));
          console.log('---------------------------', amountThreshold);
          releaseStocksForNoDeal();
          expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.not.exist();
        });
      }

      it('should release stocks if the order amount is more than the amount threshold', function() {
        dbOrders.insert(buyOrderFactory.build({ amount: amountThreshold + 1 }));
        releaseStocksForNoDeal();
        expect(dbLog.findOne({ logType: '公司釋股', companyId })).to.exist();
      });
    }

    describe('with new company', function() {
      runTests({ isNewCompany: true, recentTradeVolume: 0 });
    });

    describe('with normal company', function() {
      describe('with no recent trade volume', function() {
        runTests({ isNewCompany: false, recentTradeVolume: 0 });
      });

      describe('with a recent trade volume', function() {
        runTests({ isNewCompany: false, recentTradeVolume: 100 });
      });
    });
  });
});
