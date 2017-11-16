'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbProducts } from '/db/dbProducts';
import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/debug';

Meteor.methods({
  accuseProduct(productId, message) {
    check(this.userId, String);
    check(productId, String);
    check(message, String);
    accuseProduct(Meteor.user(), productId, message);

    return true;
  }
});
function accuseProduct(user, productId, message) {
  debug.log('accuseProduct', {user, productId, message});
  if (_.contains(user.profile.ban, 'accuse')) {
    throw new Meteor.Error(403, '您現在被金融管理會禁止了所有舉報違規行為！');
  }
  const productData = dbProducts.findOne(productId, {
    fields: {
      _id: 1,
      companyId: 1
    }
  });
  if (! productData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + productId + '」的公司！');
  }
  dbLog.insert({
    logType: '舉報違規',
    userId: [user._id],
    companyId: productData.companyId,
    productId: productId,
    message: message,
    createdAt: new Date()
  });
}
