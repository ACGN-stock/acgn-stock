'use strict';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { resourceManager } from '../resourceManager';
import { dbProducts } from '../../db/dbProducts';
import { dbCompanies } from '../../db/dbCompanies';
import { dbSeason } from '../../db/dbSeason';
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
  resourceManager.throwErrorIsResourceIsLock(['season']);
  resourceManager.request('createProduct', ['season'], (release) => {
    dbProducts.insert(productData);
    release();
  });
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
  resourceManager.throwErrorIsResourceIsLock(['season']);
  resourceManager.request('retrieveProduct', ['season'], (release) => {
    dbProducts.remove({_id: productId});
    release();
  });
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
  const seasonData = dbSeason.findOne({}, {
    sort: {
      beginDate: -1
    }
  });
  if (! seasonData) {
    throw new Meteor.Error(500, '商業季度尚未開始！');
  }
  const votePrice = seasonData.votePrice;
  const username = user.username;
  resourceManager.throwErrorIsResourceIsLock(['season', 'user' + username]);
  //先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('voteProduct', ['season', 'user' + username], (release) => {
    const user = Meteor.users.findOne({username});
    if (user.profile.vote < 1) {
      throw new Meteor.Error(403, '使用者已經沒有多餘的推薦票可以推薦！');
    }
    const companyName = productData.companyName;
    dbLog.insert({
      logType: '推薦產品',
      username: [username],
      companyName: companyName,
      productId: productId,
      price: votePrice,
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
    dbCompanies.update({companyName}, {
      $inc: {
        profit: votePrice
      }
    });
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

Meteor.publish('season', function(offset) {
  check(offset, Match.Integer);

  return dbSeason.find({}, {
    sort: {
      beginDate: -1
    },
    skip: offset === 0 ? 0 : (offset - 1),
    limit: 3
  });
});

Meteor.publish('productList', function({beginTime, endTime, sortBy, sortDir, offset}) {
  check(beginTime, Number);
  check(endTime, Number);
  check(sortBy, new Match.OneOf('votes', 'type', 'companyName'));
  check(sortDir, new Match.OneOf(1, -1));
  check(offset, Match.Integer);
  const beginDate = new Date(beginTime);
  const endDate = new Date(endTime);

  let initialized = false;
  let total = dbProducts
    .find(
      {
        createdAt: {
          $gte: beginDate,
          $lte: endDate
        }
      }
    )
    .count();
  this.added('pagination', 'productList', {total});

  const observer = dbProducts
    .find(
      {
        createdAt: {
          $gte: beginDate,
          $lte: endDate
        }
      },
      {
        sort: {
          [sortBy]: sortDir
        },
        skip: offset,
        limit: 30
      }
    )
    .observeChanges({
      added: (id, fields) => {
        this.added('products', id, fields);
        if (initialized) {
          total += 1;
          this.changed('pagination', 'productList', {total});
        }
      },
      removed: (id) => {
        this.removed('products', id);
        if (initialized) {
          total -= 1;
          this.changed('pagination', 'productList', {total});
        }
      }
    });
  initialized = true;
  this.ready();
  this.onStop(() => {
    observer.stop();
  });
});