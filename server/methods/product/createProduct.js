import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { resourceManager } from '/server/imports/resourceManager';
import { dbProducts } from '/db/dbProducts';
import { dbCompanies } from '/db/dbCompanies';
import { debug } from '/server/imports/debug';

Meteor.methods({
  createProduct(productData) {
    check(this.userId, String);
    check(productData, {
      productName: String,
      companyId: String,
      type: String,
      url: String
    });
    createProduct(Meteor.user(), productData);

    return true;
  }
});
export function createProduct(user, productData) {
  debug.log('createProduct', {user, productData});
  const companyId = productData.companyId;
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      companyName: 1,
      manager: 1,
      isSeal: 1
    }
  });
  if (companyData.manager === '!none' && ! user.profile.isAdmin) {
    throw new Meteor.Error(401, '使用者並非金融管理會委員，無法進行此操作！');
  }
  if (companyData.manager !== '!none' && user._id !== companyData.manager) {
    throw new Meteor.Error(401, '使用者並非該公司的經理人！');
  }
  if (companyData.isSeal) {
    throw new Meteor.Error(403, '「' + companyData.companyName + '」公司已被金融管理委員會查封關停了！');
  }
  const url = productData.url;
  if (dbProducts.find({companyId, url}).count() > 0) {
    throw new Meteor.Error(403, '相同的產品已經被推出過了！');
  }
  resourceManager.throwErrorIsResourceIsLock(['season']);
  productData.createdAt = new Date();
  dbProducts.insert(productData);
}
