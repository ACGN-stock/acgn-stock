import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbProducts, productReplenishBaseAmountTypeList, productReplenishBatchSizeTypeList } from '/db/dbProducts';
import { dbCompanies, getAvailableProductionFund } from '/db/dbCompanies';
import { debug } from '/server/imports/utils/debug';
import { guardCompany, guardProduct } from '/common/imports/guards';

Meteor.methods({
  editProduct({ productId, newData }) {
    check(this.userId, String);
    check(productId, String);
    check(newData, {
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

    editProduct(Meteor.user(), { productId, newData });

    return true;
  }
});

export function editProduct(currentUser, { productId, newData }) {
  debug.log('editProduct', { currentUser, productId, newData });

  const oldData = dbProducts.findByIdOrThrow(productId);
  const { companyId } = oldData;
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

  guardProduct(oldData).checkInState('planning');

  if (dbProducts.find({ _id: { $ne: productId }, companyId, url: newData.url }).count() > 0) {
    throw new Meteor.Error(403, '相同的產品已經被推出過了！');
  }

  if (productPriceLimit < newData.price) {
    throw new Meteor.Error(403, '產品售價過高！');
  }

  const oldTotalCost = oldData.price * oldData.totalAmount;
  const newTotalCost = newData.price * newData.totalAmount;
  const availableProductionFund = getAvailableProductionFund(companyData) + oldTotalCost;

  if (availableProductionFund < newTotalCost) {
    throw new Meteor.Error(403, '剩餘生產資金不足！');
  }

  resourceManager.throwErrorIsResourceIsLock(['season']);

  dbProducts.update(productId, {
    $set: {
      ...newData,
      updatedBy: manager === currentUser._id ? currentUser._id : '!FSC',
      updatedAt: new Date()
    }
  });
}
