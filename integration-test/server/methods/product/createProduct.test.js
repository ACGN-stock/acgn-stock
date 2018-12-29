import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import expect from 'must';
import mustSinon from 'must-sinon';

import { dbCompanies } from '/db/dbCompanies';
import { dbProducts } from '/db/dbProducts';
import { pttUserFactory, companyFactory, productFactory } from '/dev-utils/factories';
import { createProduct } from '/server/methods/product/createProduct';

mustSinon(expect);

describe('method createProduct', function() {
  this.timeout(10000);

  const capital = 10000;
  const baseProductionFund = 10000;
  const productPriceLimit = 100;

  let userId;
  let companyId;

  function findUser() {
    return Meteor.users.findOne(userId);
  }

  beforeEach(function() {
    resetDatabase();

    userId = Accounts.createUser(pttUserFactory.build());
    companyId = dbCompanies.insert(companyFactory.build({
      manager: userId,
      capital,
      baseProductionFund,
      productPriceLimit
    }));
  });

  it('should create a new product', function() {
    const args = {
      companyId,
      data: productFactory.build({ companyId })
    };

    createProduct(findUser(), args);

    const productData = dbProducts.findOne();
    productData.state.must.be.equal('planning');
  });

  it('should fail if the price is over the product price limit', function() {
    const args = {
      companyId,
      data: productFactory.build({ companyId, price: productPriceLimit + 1 })
    };
    createProduct.bind(null, findUser(), args).must.throw(Meteor.Error, '產品售價過高！ [403]');
  });

  it('should fail if the user is not the manager of the company', function() {
    dbCompanies.update(companyId, { $set: { manager: 'someOtherUser' } });
    const args = {
      companyId,
      data: productFactory.build({ companyId })
    };
    createProduct.bind(null, findUser(), args).must.throw(/使用者.*並非該公司的經理人！ \[401\]/);
  });

  it('should fail if the total cost is over the available production fund', function() {
    const args = {
      companyId,
      data: productFactory.build({ companyId, price: 1, totalAmount: 100000000 })
    };
    createProduct.bind(null, findUser(), args).must.throw(Meteor.Error, '剩餘生產資金不足！ [403]');
  });

  context('when the company has no manager', function() {
    beforeEach(function() {
      dbCompanies.update(companyId, { $set: { manager: '!none' } });
    });

    it('should success if the user is admin', function() {
      Meteor.users.update(userId, { $addToSet: { 'profile.roles': 'fscMember' } });
      const args = {
        companyId,
        data: productFactory.build({ companyId })
      };
      createProduct.bind(null, findUser(), args).must.not.throw();
    });

    it('should fail if the user is not admin', function() {
      Meteor.users.update(userId, { $pull: { 'profile.roles': 'fscMember' } });
      const args = {
        companyId,
        data: productFactory.build({ companyId })
      };
      createProduct.bind(null, findUser(), args).must.throw(Meteor.Error, '權限不符，無法進行此操作！ [403]');
    });
  });
});
