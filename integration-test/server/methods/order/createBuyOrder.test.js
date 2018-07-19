import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { Accounts } from 'meteor/accounts-base';
import expect from 'must';

import { createBuyOrder } from '/server/methods/order/createBuyOrder';
import { dbOrders } from '/db/dbOrders';
import { dbCompanies, getPriceLimits } from '/db/dbCompanies';
import { companyFactory, pttUserFactory } from '/dev-utils/factories';

describe('method createBuyOrder', function() {
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
      orderType: '購入',
      unitPrice: 100,
      amount: 10
    };
  });

  it('should fail if the user is in vacation', function() {
    user.profile.isInVacation = true;
    createBuyOrder.bind(null, user, orderData)
      .must.throw(Meteor.Error, '您現在正在渡假中，請好好放鬆！ [403]');
  });

  it('should fail if the user is not pay tax', function() {
    user.profile.notPayTax = true;
    createBuyOrder.bind(null, user, orderData)
      .must.throw(Meteor.Error, '您現在有稅單逾期未繳！ [403]');
  });

  it('should fail if the user is been ban deal', function() {
    user.profile.ban.push('deal');
    createBuyOrder.bind(null, user, orderData)
      .must.throw(Meteor.Error, '您現在被金融管理會禁止了所有投資下單行為！ [403]');
  });

  it('should fail if the unit price is lower than 1', function() {
    orderData.unitPrice = 0;
    createBuyOrder.bind(null, user, orderData)
      .must.throw(Meteor.Error, '購買單價不可小於1！ [403]');
  });

  it('should fail if the amount is lower than 1', function() {
    orderData.amount = 0;
    createBuyOrder.bind(null, user, orderData)
      .must.throw(Meteor.Error, '購買數量不可小於1！ [403]');
  });

  it('should fail if the user does not have enough money', function() {
    user.profile.money = 9;
    orderData.unitPrice = 2;
    orderData.amount = 5;
    createBuyOrder.bind(null, user, orderData)
      .must.throw(Meteor.Error, '剩餘金錢不足，訂單無法成立！ [403]');
  });

  it('should fail if the user is selling same company stock', function() {
    dbOrders.insert({
      companyId: orderData.companyId,
      userId: orderData.userId,
      orderType: '賣出',
      unitPrice: 100,
      amount: 100,
      done: 0,
      createdAt: new Date(0)
    });
    createBuyOrder.bind(null, user, orderData)
      .must.throw(Meteor.Error, '有賣出該公司股票的訂單正在執行中，無法同時下達購買的訂單！ [403]');
  });

  it('should fail if the company does not exist', function() {
    createBuyOrder.bind(null, user, orderData)
      .must.throw(Meteor.Error, '不存在的公司股票，訂單無法成立！ [404]');
  });

  it('should fail if the company is been seal', function() {
    const companyName = 'someCompany';
    const companyId = dbCompanies.insert(companyFactory.build({
      companyName,
      isSeal: true
    }));
    orderData.companyId = companyId;
    createBuyOrder.bind(null, user, orderData)
      .must.throw(Meteor.Error, `「${companyName}」公司已被金融管理委員會查封關停了！ [403]`);
  });

  describe('when company is exist', function() {
    let companyId;
    let companyData;

    beforeEach(function() {
      companyId = dbCompanies.insert(companyFactory.build({ listPrice: 100, isSeal: false }));
      companyData = dbCompanies.findOne(companyId);
      orderData.companyId = companyId;
    });

    it('should fail if the price is higher than the upper price', function() {
      const price = getPriceLimits(companyData).upper + 1;
      orderData.unitPrice = price;
      createBuyOrder.bind(null, user, orderData)
        .must.throw(Meteor.Error, '每股單價不可大於該股票的漲停價格！ [403]');
    });

    it('should fail if the price is lower than the lower price', function() {
      const price = getPriceLimits(companyData).lower - 1;
      orderData.unitPrice = price;
      createBuyOrder.bind(null, user, orderData)
        .must.throw(Meteor.Error, '每股單價不可低於該股票的跌停價格！ [403]');
    });

    describe('when user is exist', function() {
      let userId;

      beforeEach(function() {
        userId = Accounts.createUser(pttUserFactory.build());
        user._id = userId;
        orderData.userId = userId;
        Meteor.users.update(userId, { $set: { 'profile.money': 1000000 } });
      });

      it('should success create buy order', function() {
        createBuyOrder.bind(null, user, orderData).must.not.throw();
        const buyOrder = dbOrders.findOne({
          userId: orderData.userId,
          companyId: orderData.companyId,
          orderType: '購入'
        });
        expect(buyOrder).to.exist();
      });
    });
  });
});
