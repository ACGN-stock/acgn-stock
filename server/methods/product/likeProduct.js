import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbProducts } from '/db/dbProducts';
import { dbProductLike } from '/db/dbProductLike';
import { dbCompanies } from '/db/dbCompanies';
import { limitMethod } from '/server/imports/rateLimit';
import { debug } from '/server/imports/debug';

Meteor.methods({
  likeProduct(productId) {
    check(this.userId, String);
    check(productId, String);
    likeProduct(Meteor.user(), productId);

    return true;
  }
});
export function likeProduct(user, productId) {
  debug.log('likeProduct', {user, productId});
  if (user.profile.notPayTax) {
    throw new Meteor.Error(403, '您現在有稅單逾期未繳！');
  }
  if (_.contains(user.profile.ban, 'deal')) {
    throw new Meteor.Error(403, '您現在被金融管理會禁止了所有投資下單行為！');
  }
  const productData = dbProducts.findOne(productId);
  if (! productData) {
    throw new Meteor.Error(404, '不存在的產品！');
  }
  const companyId = productData.companyId;
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      companyName: 1,
      isSeal: 1
    }
  });
  if (! companyData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + companyId + '」的公司！');
  }
  if (companyData.isSeal) {
    throw new Meteor.Error(403, '「' + companyData.companyName + '」公司已被金融管理委員會查封關停了！');
  }
  const userId = user._id;
  const existsLikeData = dbProductLike.findOne({productId, userId});
  if (existsLikeData) {
    dbProductLike.remove(existsLikeData._id);
    dbProducts.update(productId, {
      $inc: {
        likeCount: -1
      }
    });
  }
  else {
    dbProductLike.insert({productId, companyId, userId});
    dbProducts.update(productId, {
      $inc: {
        likeCount: 1
      }
    });
  }
}
//一秒鐘最多一次
limitMethod('likeProduct', 1, 1000);
