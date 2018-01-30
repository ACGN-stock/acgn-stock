import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbProducts } from '/db/dbProducts';
import { dbCompanies } from '/db/dbCompanies';
import { debug } from '/server/imports/utils/debug';

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

  const user = Meteor.users.findOne(userId);

  if (! user) {
    throw new Meteor.Error(404, `找不到識別碼為「${userId}」的使用者！`);
  }

  const { companyId, url, price, totalAmount } = productData;

  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      companyName: 1,
      manager: 1,
      isSeal: 1,
      productionFund: 1,
      productPriceLimit: 1
    }
  });

  if (! companyData) {
    throw new Meteor.Error(404, `找不到識別碼為「${companyId}」的公司！`);
  }

  if (companyData.manager === '!none') {
    if (! user.profile.isAdmin) {
      throw new Meteor.Error(401, '使用者並非金融管理會委員，無法進行此操作！');
    }
  }
  else if (userId !== companyData.manager) {
    throw new Meteor.Error(401, '使用者並非該公司的經理人！');
  }

  if (companyData.isSeal) {
    throw new Meteor.Error(403, `「${companyData.companyName}」公司已被金融管理委員會查封關停了！`);
  }

  if (dbProducts.find({ companyId, url }).count() > 0) {
    throw new Meteor.Error(403, '相同的產品已經被推出過了！');
  }

  if (companyData.productPriceLimit < price) {
    throw new Meteor.Error(403, '產品售價過高！');
  }

  const totalCost = price * totalAmount;

  if (companyData.productionFund < totalCost) {
    throw new Meteor.Error(403, '剩餘生產資金不足！');
  }

  resourceManager.throwErrorIsResourceIsLock(['season']);

  dbProducts.insert({
    ...productData,
    state: 'planning',
    createdAt: new Date()
  });
  dbCompanies.update(companyId, { $inc: { productionFund: -totalCost } });
}
