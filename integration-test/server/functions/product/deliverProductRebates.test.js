import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { Accounts } from 'meteor/accounts-base';
import expect from 'must';

import { deliverProductRebates, computeRebate } from '/server/functions/product/deliverProductRebates';
import { companyFactory, pttUserFactory, seasonFactory, userOwnedProductFactory } from '/dev-utils/factories';
import { dbCompanies } from '/db/dbCompanies';
import { dbLog } from '/db/dbLog';
import { dbSeason, getCurrentSeason } from '/db/dbSeason';
import { dbUserOwnedProducts } from '/db/dbUserOwnedProducts';

describe('function deliverProductRebates', function() {
  this.timeout(10000);

  const { divisorAmount } = Meteor.settings.public.productRebates;
  let userId;
  let companyId;
  let seasonId;
  let productIdData;

  beforeEach(function() {
    resetDatabase();

    userId = Accounts.createUser(pttUserFactory.build());
    companyId = dbCompanies.insert(companyFactory.build());
    seasonId = dbSeason.insert(seasonFactory.build());
    productIdData = { userId, companyId, seasonId };
  });

  it('should not deliver product rebate if no one buys any product', function() {
    const expectMoney = getUserMoney(userId);

    deliverProductRebates();

    expect(findProductRebateLog()).to.not.exist();
    expect(getUserMoney(userId)).to.be.equal(expectMoney);
  });

  it('should not deliver product rebate if no one buys enough product', function() {
    const expectMoney = getUserMoney(userId);

    insertUserOwnedProducts(productIdData, {
      amount: 1,
      price: divisorAmount - 1
    });
    deliverProductRebates();

    expect(findProductRebateLog()).to.not.exist();
    expect(getUserMoney(userId)).to.be.equal(expectMoney);
  });

  it('should not deliver product rebate if is not in current season', function() {
    const expectMoney = getUserMoney(userId);

    insertUserOwnedProducts(productIdData, {
      amount: 10,
      price: divisorAmount + 1
    });
    const newSeasonDate = new Date(getCurrentSeason().beginDate.getTime() + 86400000);
    seasonId = dbSeason.insert(seasonFactory.build({ beginDate: newSeasonDate }));
    deliverProductRebates();

    expect(findProductRebateLog()).to.not.exist();
    expect(getUserMoney(userId)).to.be.equal(expectMoney);
  });

  it('should not deliver product rebate if company is sealed', function() {
    const expectMoney = getUserMoney(userId);

    dbCompanies.update(companyId, { $set: { isSeal: true } });
    insertUserOwnedProducts(productIdData, {
      amount: 10,
      price: divisorAmount + 1
    });
    deliverProductRebates();

    expect(findProductRebateLog()).to.not.exist();
    expect(getUserMoney(userId)).to.be.equal(expectMoney);
  });

  it('should deliver product rebate (one product)', function() {
    const amount = divisorAmount;
    const price = 1;
    const expectMoney = getUserMoney(userId) + computeRebate(price * amount);

    insertUserOwnedProducts(productIdData, { amount, price });
    deliverProductRebates();

    expect(findProductRebateLog({ companyId })).to.exist();
    expect(getUserMoney(userId)).to.be.equal(expectMoney);
  });

  it('should deliver product rebate (multi products)', function() {
    const productNumber = 5; // 產品種數
    const amount = Math.ceil(divisorAmount / productNumber);
    const price = 1;
    const expectMoney = getUserMoney(userId) + computeRebate(price * amount * productNumber);

    for (let i = 0; i < productNumber; i += 1) {
      insertUserOwnedProducts(productIdData, { amount, price });
    }
    deliverProductRebates();

    expect(findProductRebateLog({ companyId })).to.exist();
    expect(getUserMoney(userId)).to.be.equal(expectMoney);
  });


  describe('when multi companies', function() {
    let companyId2;
    let productIdDataWithCompany2;

    beforeEach(function() {
      companyId2 = dbCompanies.insert(companyFactory.build());
      productIdDataWithCompany2 = { userId, companyId: companyId2, seasonId };
    });

    it('should not deliver product rebate if no one buys enough product', function() {
      const expectMoney = getUserMoney(userId);
      const amount = 1;
      const price = divisorAmount - 1;

      insertUserOwnedProducts(productIdData, { amount, price });
      insertUserOwnedProducts(productIdDataWithCompany2, { amount, price });
      deliverProductRebates();

      expect(findProductRebateLog()).to.not.exist();
      expect(getUserMoney(userId)).to.be.equal(expectMoney);
    });

    it('should deliver product rebate', function() {
      const amount = divisorAmount;
      const price = 10;
      const expectMoney = getUserMoney(userId) + computeRebate(price * amount) + computeRebate(price * amount);
      // 2間公司的回饋應該分開計算

      insertUserOwnedProducts(productIdData, { amount, price });
      insertUserOwnedProducts(productIdDataWithCompany2, { amount, price });
      deliverProductRebates();

      expect(findProductRebateLog({ companyId })).to.exist();
      expect(findProductRebateLog({ companyId: companyId2 })).to.exist();
      expect(getUserMoney(userId)).to.be.equal(expectMoney);
    });
  });


  describe('when multi users', function() {
    let userId2;
    let productIdDataWithUser2;

    beforeEach(function() {
      userId2 = Accounts.createUser(pttUserFactory.build());
      productIdDataWithUser2 = { userId: userId2, companyId, seasonId };
    });

    it('should not deliver product rebate if no one buys enough product', function() {
      const expectMoney = getUserMoney(userId);
      const expectMoney2 = getUserMoney(userId2);
      const amount = 1;
      const price = divisorAmount - 1;

      insertUserOwnedProducts(productIdData, { amount, price });
      insertUserOwnedProducts(productIdDataWithUser2, { amount, price });
      deliverProductRebates();

      expect(findProductRebateLog()).to.not.exist();
      expect(getUserMoney(userId)).to.be.equal(expectMoney);
      expect(getUserMoney(userId2)).to.be.equal(expectMoney2);
    });

    it('should deliver product rebate', function() {
      const amount = divisorAmount;
      const price = 10;
      const expectMoney = getUserMoney(userId) + computeRebate(price * amount);
      const expectMoney2 = getUserMoney(userId2) + computeRebate(price * amount);

      insertUserOwnedProducts(productIdData, { amount, price });
      insertUserOwnedProducts(productIdDataWithUser2, { amount, price });
      deliverProductRebates();

      expect(findProductRebateLog({ companyId })).to.exist();
      expect(getUserMoney(userId)).to.be.equal(expectMoney);
      expect(getUserMoney(userId2)).to.be.equal(expectMoney2);
    });
  });
});


function findProductRebateLog(customSetting) {
  if (customSetting) {
    return dbLog.findOne({ logType: '消費回饋', ...customSetting });
  }
  else {
    return dbLog.findOne({ logType: '消費回饋' });
  }
}

function insertUserOwnedProducts(productIdData, customSetting) {
  const createData = customSetting ? { ...productIdData, ...customSetting } : { ...productIdData };
  const userOwnedProduct = userOwnedProductFactory.build(createData);

  return dbUserOwnedProducts.insert(userOwnedProduct);
}

function getUserMoney(userId) {
  const user = Meteor.users.findOne(userId);

  return user.profile.money;
}
