import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { dbProducts } from '/db/dbProducts';
import { dbProductLike } from '/db/dbProductLike';
import { dbLog } from '/db/dbLog';
import { dbSeason } from '/db/dbSeason';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  takeDownProduct({productId, message}) {
    check(this.userId, String);
    check(productId, String);
    check(message, String);
    takeDownProduct(Meteor.user(), {productId, message});

    return true;
  }
});
function takeDownProduct(user, {productId, message}) {
  debug.log('takeDownProduct', {user, productId, message});
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '您並非金融管理會委員，無法進行此操作！');
  }
  const productData = dbProducts.findOne(productId);
  if (! productData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + productId + '」的產品，該產品可能已被下架！');
  }
  const companyId = productData.companyId;
  const seasonData = dbSeason.findOne(productData.seasonId);
  const votePrice = seasonData.votePrice;
  const voteProfit = productData.votes * votePrice;
  dbCompanies.update(companyId, {
    $inc: {
      profit: voteProfit * -1
    }
  });
  dbLog.insert({
    logType: '產品下架',
    userId: [user._id],
    companyId: companyId,
    data: {
      reason: message,
      productId: productId,
      profit: voteProfit
    },
    createdAt: new Date()
  });
  dbProducts.remove(productId);
  dbProductLike.remove({productId});
}
