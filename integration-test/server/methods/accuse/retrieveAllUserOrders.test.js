import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { Accounts } from 'meteor/accounts-base';
import expect from 'must';
import faker from 'faker';

import { retrieveAllUserOrders } from '/server/methods/accuse/retrieveAllUserOrders';
import { pttUserFactory, orderFactory, directorFactory } from '/dev-utils/factories';
import { dbOrders } from '/db/dbOrders';
import { dbLog } from '/db/dbLog';
import { dbDirectors } from '/db/dbDirectors';

describe('method retrieveAllUserOrders', function() {
  this.timeout(10000);

  let userId;
  let currentUser;
  let buyOrder;
  let sellOrder;
  let inDirectorsSellOrder;
  const reason = 'some reason';
  let violationCaseId;

  const runRetrieveAllUserOrders = () => {
    return retrieveAllUserOrders.bind(null, currentUser, { userId, reason, violationCaseId });
  };

  beforeEach(function() {
    resetDatabase();
    userId = Accounts.createUser(pttUserFactory.build());
    currentUser = {
      profile: {
        roles: ['fscMember']
      }
    };

    buyOrder = orderFactory.build({ userId, orderType: '購入' });
    dbOrders.insert(buyOrder);

    sellOrder = orderFactory.build({ userId, orderType: '賣出' });
    sellOrder.done = faker.random.number({ min: 1, max: sellOrder.amount - 1 });
    dbOrders.insert(sellOrder);

    inDirectorsSellOrder = orderFactory.build({ userId, orderType: '賣出' });
    dbOrders.insert(inDirectorsSellOrder);
    dbDirectors.insert(directorFactory.build({ userId, companyId: inDirectorsSellOrder.companyId }));

    violationCaseId = undefined;
  });

  it('should fail if the current user is not fsc member', function() {
    currentUser.profile.roles = [];

    runRetrieveAllUserOrders().must.throw(Meteor.Error, '權限不符，無法進行此操作！ [403]');
    expect(findOrder({ userId })).to.exist();
    expect(findFscRetrieveOrderLog()).to.not.exist();
  });

  it('should fail if the user is not exist', function() {
    Meteor.users.remove({});

    runRetrieveAllUserOrders().must.throw(Meteor.Error, `找不到識別碼為「${userId}」的使用者！ [404]`);
    expect(findOrder({ userId })).to.exist();
    expect(findFscRetrieveOrderLog()).to.not.exist();
  });

  it('should fail if the violation case is not exist', function() {
    violationCaseId = faker.random.uuid();

    runRetrieveAllUserOrders().must.throw(Meteor.Error, `找不到識別碼為「${violationCaseId}」的違規案件！ [404]`);
    expect(findOrder({ userId })).to.exist();
    expect(findFscRetrieveOrderLog()).to.not.exist();
  });

  it('should success retrieve all user orders', function() {
    const expectMoney = findUserById(userId).profile.money + buyOrder.unitPrice * buyOrder.amount;
    const expectStocks = findDirectorData({ userId, companyId: inDirectorsSellOrder.companyId }).stocks + inDirectorsSellOrder.amount;

    runRetrieveAllUserOrders().must.not.throw();


    expect(findOrder({ userId })).to.not.exist();
    expect(findFscRetrieveOrderLog()).to.exist();

    const userMoney = findUserById(userId).profile.money;
    expect(userMoney).to.equal(expectMoney);

    const userStocks = findDirectorData({ userId, companyId: inDirectorsSellOrder.companyId }).stocks;
    expect(userStocks).to.equal(expectStocks);

    const directorData = findDirectorData({ userId, companyId: sellOrder.companyId });
    expect(directorData).to.exist();
    expect(directorData.stocks).to.equal(sellOrder.amount - sellOrder.done);
  });

  describe('when multi-user', function() {
    let userIds;

    beforeEach(function() {
      userIds = [userId];
      userIds.push(Accounts.createUser(pttUserFactory.build()));
      dbOrders.insert(orderFactory.build({ userId: userIds[1] }));
    });

    it(`should success retrieve target user's orders, and do not retrieve other user's orders`, function() {
      runRetrieveAllUserOrders().must.not.throw();

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
