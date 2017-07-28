'use strict';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { lockManager } from '../../lockManager';
import { dbProducts } from '../../db/dbProducts';
import { dbCompanies } from '../../db/dbCompanies';
import { dbLog } from '../../db/dbLog';

Meteor.methods({
  createProduct(productData) {
    check(this.userId, String);
    check(productData, {
      productName: String,
      companyName: String,
      type: String,
      url: String
    });
    createProduct(Meteor.user(), productData);

    return true;
  }
});

export function createProduct(user, productData) {
  const manager = user.username;
  const companyName = productData.companyName;
  if (! dbCompanies.findOne({companyName, manager})) {
    throw new Meteor.Error(401, '登入使用者並非註冊的公司經理人！');
  }
  const unlock = lockManager.lock([user._id, 'product']);
  productData.createdAt = new Date();
  const productId = dbProducts.insert(productData);
  dbLog.insert({
    logType: '產品發布',
    username: [manager],
    companyName: companyName,
    productId: productId,
    createdAt: new Date()
  });
  unlock();
}

Meteor.methods({
  retrieveProduct(productId) {
    check(this.userId, String);
    check(productId, String);
    retrieveProduct(Meteor.user(), productId);

    return true;
  }
});

export function retrieveProduct(user, productId) {
  const manager = user.username;
  const productData = dbProducts.findOne(productId);
  if (! productData) {
    throw new Meteor.Error(404, '不存在的產品！');
  }
  const companyName = productData.companyName;
  if (! dbCompanies.findOne({companyName, manager})) {
    throw new Meteor.Error(401, '登入使用者並非註冊的公司經理人！');
  }
  const unlock = lockManager.lock([user._id, productId, 'product']);
  dbLog.insert({
    logType: '產品下架',
    username: [manager],
    companyName: companyName,
    productId: productId,
    createdAt: new Date()
  });
  dbProducts.remove({_id: productId});
  unlock();
}

Meteor.methods({
  voteProduct(productId) {
    check(this.userId, String);
    check(productId, String);
    voteProduct(Meteor.user(), productId);

    return true;
  }
});

export function voteProduct(user, productId) {
  if (user.profile.vote < 1) {
    throw new Meteor.Error(403, '使用者已經沒有多餘的推薦票可以推薦！');
  }
  const productData = dbProducts.findOne({
    _id: productId
  });
  if (! productData) {
    throw new Meteor.Error(404, '不存在的產品！');
  }
  const unlock = lockManager.lock([user._id, productId, 'product']);
  const username = user.username;
  dbLog.insert({
    logType: '推薦產品',
    username: [username],
    companyName: productData.companyName,
    productId: productId,
    createdAt: new Date()
  });
  Meteor.users.update({
    _id: user._id
  }, {
    $inc: {
      'profile.vote': -1
    }
  });
  dbProducts.update({
    _id: productId
  }, {
    $inc: {
      votes: 1
    }
  });
  unlock();
}
