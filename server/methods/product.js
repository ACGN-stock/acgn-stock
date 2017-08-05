'use strict';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { resourceManager } from '../resourceManager';
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
  const url = productData.url;
  if (dbProducts.findOne({companyName, url})) {
    throw new Meteor.Error(403, '相同的產品已經被推出過了！');
  }
  productData.createdAt = new Date();
  dbProducts.insert(productData);
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
  dbProducts.remove({_id: productId});
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
  const username = user.username;
  resourceManager.throwErrorIsResourceIsLock(['earnProfit', 'user' + username]);
  //先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('createBuyOrder', ['earnProfit', 'user' + username], (release) => {
    const user = Meteor.users.findOne({username});
    dbLog.insert({
      logType: '推薦產品',
      username: [username],
      companyName: productData.companyName,
      productId: productId,
      createdAt: new Date()
    });
    Meteor.users.update(
      {
        _id: user._id
      },
      {
        $inc: {
          'profile.vote': -1
        }
      }
    );
    dbProducts.update(
      {
        _id: productId
      },
      {
        $inc: {
          votes: 1
        }
      }
    );
    release();
  });
}

Meteor.publish('companyFutureProduct', function(companyName) {
  check(companyName, String);
  const overdue = 0;

  return dbProducts.find({companyName, overdue});
});
