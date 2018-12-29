import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbProducts, productReplenishBaseAmountTypeList, productReplenishBatchSizeTypeList } from '/db/dbProducts';
import { dbCompanies, getAvailableProductionFund } from '/db/dbCompanies';
import { debug } from '/server/imports/utils/debug';
import { guardCompany } from '/common/imports/guards';

Meteor.methods({
  createProduct({ companyId, data }) {
    check(this.userId, String);
    check(companyId, String);
    check(data, {
      productName: String,
      type: String,
      rating: String,
      url: String,
      price: Match.Integer,
      totalAmount: Match.Integer,
      description: new Match.Maybe(String),
      replenishBatchSizeType: new Match.OneOf(...productReplenishBatchSizeTypeList),
      replenishBaseAmountType: new Match.OneOf(...productReplenishBaseAmountTypeList)
    });
    createProduct(Meteor.user(), { companyId, data });

    return true;
  }
});

export function createProduct(currentUser, { companyId, data }) {
  debug.log('createProduct', { userId: currentUser._id, data });

  const { url, price, totalAmount } = data;

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
    .checkIsManageableByUser(currentUser)
    .checkNotSealed();

  const { manager, productPriceLimit } = companyData;

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
    ...data,
    companyId,
    state: 'planning',
    creator: manager === currentUser._id ? currentUser._id : '!FSC',
    createdAt: new Date()
  });
}
