import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import expect from 'must';

import { executeBulksSync } from '/server/imports/utils/executeBulksSync';
import { companyFactory, orderFactory } from '/dev-utils/factories';
import { dbLog } from '/db/dbLog';
import { dbCompanies } from '/db/dbCompanies';
import { dbOrders } from '/db/dbOrders';

describe('util executeBulksSync', function() {
  // 每次測試產生20K筆資料, 故給予較多時間
  this.timeout(20000);

  let logBulk;
  let companiesBulk;
  let usersBulk;
  let ordersBulk;

  const runExecuteBulksSync = (...bulks) => {
    return executeBulksSync.bind(null, ...bulks, logBulk, companiesBulk, usersBulk, ordersBulk);
  };

  beforeEach(function() {
    resetDatabase();
    logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
    companiesBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
    usersBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();
    ordersBulk = dbOrders.rawCollection().initializeUnorderedBulkOp();
  });

  it('should not change any db if no operation', function() {
    const oldDb = getDbsData();
    runExecuteBulksSync().must.not.throw();
    const newDb = getDbsData();

    expect(newDb).to.eql(oldDb);
  });


  describe('when have some insert operations', function() {
    const insertNumber = 10000;

    beforeEach(function() {
      companyFactory.buildList(insertNumber).forEach((company) => {
        companiesBulk.insert(company);
      });
      orderFactory.buildList(insertNumber).forEach((order) => {
        ordersBulk.insert(order);
      });
    });

    it('should success insert data', function() {
      const oldDb = getDbsData();
      runExecuteBulksSync().must.not.throw();
      const newDb = getDbsData();

      expect(newDb.log).to.eql(oldDb.log);
      expect(newDb.users).to.eql(oldDb.users);
      expect(newDb.companies).to.not.eql(oldDb.companies);
      expect(newDb.orders).to.not.eql(oldDb.orders);
      expect(newDb.companies.length).to.equal(insertNumber);
      expect(newDb.orders.length).to.equal(insertNumber);
    });


    describe('when bulk have some error', function() {
      let fakeBulk;

      beforeEach(function() {
        fakeBulk = {
          length: 10,
          execute: () => {
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                reject('fakeBulk');
              }, 0);
            });
          }
        };
      });

      it('should throw error, but other normal bulk should success execute', function(done) {
        const oldDb = getDbsData();
        runExecuteBulksSync(fakeBulk).must.throw();

        // 過快讀取db可能造成bulk.execute還沒執行完成, 需要等待一段時間
        const waitTime = 1000;
        setTimeout(Meteor.bindEnvironment(() => {
          const newDb = getDbsData();

          expect(newDb.log).to.eql(oldDb.log);
          expect(newDb.users).to.eql(oldDb.users);
          expect(newDb.companies).to.not.eql(oldDb.companies);
          expect(newDb.orders).to.not.eql(oldDb.orders);
          expect(newDb.companies.length).to.equal(insertNumber);
          expect(newDb.orders.length).to.equal(insertNumber);
          done();
        }), waitTime);
      });
    });
  });
});

function getDbsData() {
  const log = dbLog.find().fetch();
  const companies = dbCompanies.find().fetch();
  const users = Meteor.users.find().fetch();
  const orders = dbOrders.find().fetch();

  return { log, companies, users, orders };
}
