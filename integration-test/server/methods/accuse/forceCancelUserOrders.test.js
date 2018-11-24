import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { Accounts } from 'meteor/accounts-base';
import expect from 'must';
import faker from 'faker';

import { forceCancelUserOrders } from '/server/methods/accuse/forceCancelUserOrders';
import { pttUserFactory, orderFactory, directorFactory } from '/dev-utils/factories';
import { dbOrders } from '/db/dbOrders';
import { dbLog } from '/db/dbLog';
import { dbDirectors } from '/db/dbDirectors';

describe('method forceCancelUserOrders', function() {
  this.timeout(10000);

  let userId;
  let currentUser;
  let buyOrder;
  let sellOrder;
  let inDirectorsSellOrder;
  let sameCompanySellOrders = [];
  const reason = 'some reason';
  let violationCaseId;

  const runForceCancelUserOrders = () => {
    return forceCancelUserOrders.bind(null, currentUser, { userId, reason, violationCaseId });
  };

  beforeEach(function() {
    resetDatabase();
    userId = Accounts.createUser(pttUserFactory.build());
    currentUser = {
      profile: {
        roles: ['fscMember']
      }
    };

    buyOrder = orderFactory.build({ userId, orderType: '購入', amount: faker.random.number({ min: 2 }) });
    buyOrder.done = faker.random.number({ min: 1, max: buyOrder.amount - 1 });
    dbOrders.insert(buyOrder);

    sellOrder = orderFactory.build({ userId, orderType: '賣出', amount: faker.random.number({ min: 2 }) });
    sellOrder.done = faker.random.number({ min: 1, max: sellOrder.amount - 1 });
    dbOrders.insert(sellOrder);

    inDirectorsSellOrder = orderFactory.build({ userId, orderType: '賣出' });
    dbOrders.insert(inDirectorsSellOrder);
    dbDirectors.insert(directorFactory.build({ userId, companyId: inDirectorsSellOrder.companyId }));

    sameCompanySellOrders = [];
    sameCompanySellOrders.push(orderFactory.build({ userId, orderType: '賣出' }));
    sameCompanySellOrders.push(orderFactory.build({ userId, orderType: '賣出', companyId: sameCompanySellOrders[0].companyId }));
    dbOrders.insert(sameCompanySellOrders[0]);
    dbOrders.insert(sameCompanySellOrders[1]);

    violationCaseId = undefined;
  });

  it('should fail if the current user is not fsc member', function() {
    currentUser.profile.roles = [];

    runForceCancelUserOrders().must.throw(Meteor.Error, '權限不符，無法進行此操作！ [403]');
    expect(findOrder({ userId })).to.exist();
    expect(findFscRetrieveOrderLog()).to.not.exist();
  });

  it('should fail if the user is not exist', function() {
    Meteor.users.remove({});

    runForceCancelUserOrders().must.throw(Meteor.Error, `找不到識別碼為「${userId}」的使用者！ [404]`);
    expect(findOrder({ userId })).to.exist();
    expect(findFscRetrieveOrderLog()).to.not.exist();
  });

  it('should fail if the violation case is not exist', function() {
    violationCaseId = faker.random.uuid();

    runForceCancelUserOrders().must.throw(Meteor.Error, `找不到識別碼為「${violationCaseId}」的違規案件！ [404]`);
    expect(findOrder({ userId })).to.exist();
    expect(findFscRetrieveOrderLog()).to.not.exist();
  });

  it('should success retrieve all user orders', function() {
    const expectMoney = findUserById(userId).profile.money + buyOrder.unitPrice * (buyOrder.amount - buyOrder.done);
    const expectStocks = findDirectorData({ userId, companyId: inDirectorsSellOrder.companyId }).stocks + inDirectorsSellOrder.amount;

    runForceCancelUserOrders().must.not.throw();


    expect(findOrder({ userId })).to.not.exist();
    expect(findFscRetrieveOrderLog()).to.exist();

    // 確認money有正確歸還
    const userMoney = findUserById(userId).profile.money;
    expect(userMoney).to.equal(expectMoney);

    // 確認股數有加進原本在dbDirectors中的資料
    const userStocks = findDirectorData({ userId, companyId: inDirectorsSellOrder.companyId }).stocks;
    expect(userStocks).to.equal(expectStocks);

    // 確認股票資料有新寫入dbDirectors
    const directorData = findDirectorData({ userId, companyId: sellOrder.companyId });
    expect(directorData).to.exist();
    expect(directorData.stocks).to.equal(sellOrder.amount - sellOrder.done);

    // 確認2筆同公司賣單會寫入同一條dbDirectors (原本在dbDirectors中沒有這筆資料)
    const twoSellOrderCompanyDirectorData = findDirectorData({ userId, companyId: sameCompanySellOrders[0].companyId });
    expect(twoSellOrderCompanyDirectorData).to.exist();
    expect(twoSellOrderCompanyDirectorData.stocks).to.equal(sameCompanySellOrders[0].amount + sameCompanySellOrders[1].amount);
    const twoSellOrderCompanyDirectorDataList = dbDirectors.find({ userId, companyId: sameCompanySellOrders[0].companyId }).fetch();
    expect(twoSellOrderCompanyDirectorDataList.length).to.equal(1);
  });

  describe('when multi-user', function() {
    let userIds;

    beforeEach(function() {
      userIds = [userId];
      userIds.push(Accounts.createUser(pttUserFactory.build()));
      dbOrders.insert(orderFactory.build({ userId: userIds[1] }));
    });

    it(`should success retrieve target user's orders, and do not retrieve other user's orders`, function() {
      runForceCancelUserOrders().must.not.throw();

      expect(findOrder({ userId })).to.not.exist();
      expect(findFscRetrieveOrderLog({ userId: { $in: [userId] } })).to.exist();

      expect(findOrder({ userId: userIds[1] })).to.exist();
      expect(findFscRetrieveOrderLog({ userId: { $in: [userIds[1]] } })).to.not.exist();
    });
  });
});

function findOrder(selector) {
  if (selector) {
    return dbOrders.findOne({ ...selector });
  }
  else {
    return dbOrders.findOne({});
  }
}

function findFscRetrieveOrderLog(selector) {
  if (selector) {
    return dbLog.findOne({ logType: '金管撤單', ...selector });
  }
  else {
    return dbLog.findOne({ logType: '金管撤單' });
  }
}

function findUserById(userId) {
  return Meteor.users.findOne(userId);
}

function findDirectorData(selector) {
  if (selector) {
    return dbDirectors.findOne({ ...selector });
  }
  else {
    return dbDirectors.findOne({});
  }
}
