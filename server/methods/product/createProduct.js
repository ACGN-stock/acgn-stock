import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbProducts } from '/db/dbProducts';
import { dbCompanies, getAvailableProductionFund } from '/db/dbCompanies';
import { debug } from '/server/imports/utils/debug';
import { guardCompany } from '/common/imports/guards';

Meteor.methods({
  createProduct(productData) {
    check(this.userId, String);
    check(productData, {
      productName: String,
      companyId: String,
      type: String,
      url: String,
      price: Match.Integer,
      totalAmount: Match.Integer,
      description: new Match.Maybe(String)
    });
    createProduct(this.userId, productData);

    return true;
  }
});

export function createProduct(userId, productData) {
  debug.log('createProduct', { userId, productData });

  const user = Meteor.users.findByIdOrThrow(userId);

  const { companyId, url, price, totalAmount } = productData;

  const companyData = dbCompanies.findByIdOrThrow(companyId, {
    fields: {
      companyName: 1,
      manager: 1,
      isSeal: 1,
      capital: 1,
      baseProductionFund: 1,
      productPriceLimit: 1
    }
  });

  guardCompany(companyData)
    .checkIsManagableByUser(user)
    .checkNotSealed();

  const { productPriceLimit } = companyData;

  if (dbProducts.find({ companyId, url }).count() > 0) {
    throw new Meteor.Error(403, '相同的產品已經被推出過了！');
  }

  if (productPriceLimit < price) {
    throw new Meteor.Error(403, '產品售價過高！');
  }

  const totalCost = price * totalAmount;
  const availableProductionFund = getAvailableProductionFund(companyData);

  if (availableProductionFund < totalCost) {
    throw new Meteor.Error(403, '剩餘生產資金不足！');
  }

  resourceManager.throwErrorIsResourceIsLock(['season']);

  dbProducts.insert({
    ...productData,
    state: 'planning',
    createdAt: new Date()
  });
}
