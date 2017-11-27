import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbProducts } from '/db/dbProducts';
import { dbCompanies } from '/db/dbCompanies';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  retrieveProduct(productId) {
    check(this.userId, String);
    check(productId, String);
    retrieveProduct(Meteor.user(), productId);

    return true;
  }
});
export function retrieveProduct(user, productId) {
  debug.log('retrieveProduct', {user, productId});
  const productData = dbProducts.findOne(productId);
  if (! productData) {
    throw new Meteor.Error(404, '不存在的產品！');
  }
  if (productData.overdue !== 0) {
    throw new Meteor.Error(401, '該產品的已經上架了，無法收回！');
  }
  const companyId = productData.companyId;
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      companyName: 1,
      manager: 1,
      isSeal: 1
    }
  });
  if (user._id !== companyData.manager && ! user.profile.isAdmin) {
    throw new Meteor.Error(401, '使用者並非該公司的經理人也非金管會成員！');
  }
  if (companyData.isSeal) {
    throw new Meteor.Error(403, '「' + companyData.companyName + '」公司已被金融管理委員會查封關停了！');
  }
  resourceManager.throwErrorIsResourceIsLock(['season']);
  dbProducts.remove(productId);
}
