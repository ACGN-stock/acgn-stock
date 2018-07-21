import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { Accounts } from 'meteor/accounts-base';
import expect from 'must';

import { createSellOrder } from '/server/methods/order/createSellOrder';
import { dbOrders } from '/db/dbOrders';
import { dbCompanies, getPriceLimits } from '/db/dbCompanies';
import { companyFactory, pttUserFactory } from '/dev-utils/factories';
import { dbDirectors } from '/db/dbDirectors';

describe('method createSellOrder', function() {
  this.timeout(10000);

  let user;
  let orderData;

  beforeEach(function() {
    resetDatabase();
    user = {
      _id: 'someUser',
      profile: {
        money: 1000000,
        isInVacation: false,
        notPayTax: false,
        ban: []
      }
    };
    orderData = {
      userId: 'someUser',
      companyId: 'someCompany',
      orderType: '賣出',
      unitPrice: 100,
      amount: 10
    };
  });

  it('should fail if the user is in vacation', function() {
    user.profile.isInVacation = true;
    createSellOrder.bind(null, user, orderData)
      .must.throw(Meteor.Error, '您現在正在渡假中，請好好放鬆！ [403]');
  });

  it('should fail if the user is been ban deal', function() {
    user.profile.ban.push('deal');
    createSellOrder.bind(null, user, orderData)
      .must.throw(Meteor.Error, '您現在被金融管理會禁止了所有投資下單行為！ [403]');
  });

  it('should fail if the unit price is lower than 1', function() {
    orderData.unitPrice = 0;
    createSellOrder.bind(null, user, orderData)
      .must.throw(Meteor.Error, '販賣單價不可小於1！ [403]');
  });

  it('should fail if the amount is lower than 1', function() {
    orderData.amount = 0;
    createSellOrder.bind(null, user, orderData)
      .must.throw(Meteor.Error, '販賣數量不可小於1！ [403]');
  });

  it('should fail if the user is selling same company stock', function() {
    dbOrders.insert({
      companyId: orderData.companyId,
      userId: orderData.userId,
      orderType: '購入',
      unitPrice: 100,
      amount: 100,
      done: 0,
      createdAt: new Date(0)
    });
    createSellOrder.bind(null, user, orderData)
      .must.throw(Meteor.Error, '有買入該公司股票的訂單正在執行中，無法同時下達賣出的訂單！ [403]');
  });

  it('should fail if the user does not have any stock', function() {
    createSellOrder.bind(null, user, orderData)
      .must.throw(Meteor.Error, '擁有的股票數量不足，訂單無法成立！ [403]');
  });

  it('should fail if the user does not have enough stock', function() {
    dbDirectors.insert({
      companyId: orderData.companyId,
      userId: orderData.userId,
      stocks: orderData.amount - 1,
      createdAt: new Date()
    });
    createSellOrder.bind(null, user, orderData)
      .must.throw(Meteor.Error, '擁有的股票數量不足，訂單無法成立！ [403]');
  });


  describe('when the user has enough stock', function() {
    beforeEach(function() {
      dbDirectors.insert({
        companyId: orderData.companyId,
        userId: orderData.userId,
        stocks: orderData.amount,
        createdAt: new Date()
      });
    });

    it('should fail if the company does not exist', function() {
      createSellOrder.bind(null, user, orderData)
        .must.throw(Meteor.Error, '不存在的公司股票，訂單無法成立！ [404]');
    });
  });

  describe('when the user has enough stock, company is exist', function() {
    const companyName = 'someCompany';
    let companyId;
    let companyData;

    beforeEach(function() {
      companyId = dbCompanies.insert(companyFactory.build({
        companyName,
        listPrice: 100,
        isSeal: false
      }));
      companyData = dbCompanies.findOne(companyId);
      orderData.companyId = companyId;

      dbDirectors.insert({
        companyId: orderData.companyId,
        userId: orderData.userId,
        stocks: orderData.amount,
        createdAt: new Date()
      });
    });

    it('should fail if the company is been seal', function() {
      dbCompanies.update(companyId, { $set: { isSeal: true } });
      orderData.companyId = companyId;
      createSellOrder.bind(null, user, orderData)
        .must.throw(Meteor.Error, `「${companyName}」公司已被金融管理委員會查封關停了！ [403]`);
    });

    it('should fail if the price is higher than the upper price', function() {
      const price = getPriceLimits(companyData).upper + 1;
      orderData.unitPrice = price;
      createSellOrder.bind(null, user, orderData)
        .must.throw(Meteor.Error, '每股單價不可大於該股票的漲停價格！ [403]');
    });

    it('should fail if the price is lower than the lower price', function() {
      const price = getPriceLimits(companyData).lower - 1;
      orderData.unitPrice = price;
      createSellOrder.bind(null, user, orderData)
        .must.throw(Meteor.Error, '每股單價不可低於該股票的跌停價格！ [403]');
    });
  });

  describe('when the user has enough stock, company is exist, user is exist', function() {
    const companyName = 'someCompany';
    let companyId;
    let userId;

    beforeEach(function() {
      userId = Accounts.createUser(pttUserFactory.build());
      user._id = userId;
      orderData.userId = userId;

      companyId = dbCompanies.insert(companyFactory.build({
        companyName,
        listPrice: 100,
        isSeal: false
      }));
      orderData.companyId = companyId;

      dbDirectors.insert({
        companyId: orderData.companyId,
        userId: orderData.userId,
        stocks: orderData.amount,
        createdAt: new Date()
      });
    });

    it('should success create buy order and do not have directorData', function() {
      dbDirectors.update({ companyId, userId }, { $set: { stocks: orderData.amount } });
      createSellOrder.bind(null, user, orderData).must.not.throw();
      const sellOrder = dbOrders.findOne({
        userId: orderData.userId,
        companyId: orderData.companyId,
        orderType: '賣出'
      });
      expect(sellOrder).to.exist();

      const directorData = dbDirectors.findOne({ companyId, userId }, {
        fields: {
          stocks: 1
        }
      });
      expect(directorData).to.not.exist();
    });

    it('should success create buy order and still have directorData', function() {
      dbDirectors.update({ companyId, userId }, { $set: { stocks: orderData.amount + 1 } });
      createSellOrder.bind(null, user, orderData).must.not.throw();
      const sellOrder = dbOrders.findOne({
        userId: orderData.userId,
        companyId: orderData.companyId,
        orderType: '賣出'
      });
      expect(sellOrder).to.exist();

      const directorData = dbDirectors.findOne({ companyId, userId }, {
        fields: {
          stocks: 1
        }
      });
      expect(directorData).to.exist();
    });
  });
});
