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
  if (dbCompanies.find({companyName, manager}).count() < 1) {
    throw new Meteor.Error(401, '登入使用者並非註冊的公司經理人！');
  }
  const url = productData.url;
  if (dbProducts.find({companyName, url}).count() > 0) {
    throw new Meteor.Error(403, '相同的產品已經被推出過了！');
  }
  resourceManager.throwErrorIsResourceIsLock(['season']);
  const seasonData = dbSeason.findOne({}, {
    sort: {
      createdAt: -1
    },
    fields: {
      _id: 1
    }
  });
  productData.seasonId = seasonData._id;
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
  if (dbCompanies.find({companyName, manager}).count() < 1) {
    throw new Meteor.Error(401, '登入使用者並非註冊的公司經理人！');
  }
  resourceManager.throwErrorIsResourceIsLock(['season']);
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
  const productData = dbProducts.findOne(productId);
  if (! productData) {
    throw new Meteor.Error(404, '不存在的產品！');
  }
  if (productData.overdue !== 1) {
    throw new Meteor.Error(401, '該產品的投票截止日期已經超過了！');
  }
  const seasonData = dbSeason.findOne({}, {
    sort: {
      beginDate: -1
    }
  });
  if (! seasonData) {
    throw new Meteor.Error(500, '商業季度尚未開始！');
  }
  const companyName = productData.companyName;
  const votePrice = seasonData.votePrice;
  const username = user.username;
  resourceManager.throwErrorIsResourceIsLock(['season', 'companyProfit' + companyName, 'user' + username]);
  //先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('voteProduct', ['companyProfit' + companyName, 'user' + username], (release) => {
    const user = Meteor.users.findOne({username}, {
      fields: {
        _id: 1,
        profile: 1
      }
    });
    if (user.profile.vote < 1) {
      throw new Meteor.Error(403, '使用者已經沒有多餘的推薦票可以推薦！');
    }
    dbLog.insert({
      logType: '推薦產品',
      username: [username],
      companyName: companyName,
      productId: productId,
      price: votePrice,
      createdAt: new Date()
    });
    Meteor.users.update(user._id, {
      $inc: {
        'profile.vote': -1
      }
    });
    dbCompanies.update({companyName}, {
      $inc: {
        profit: votePrice
      }
    });
    dbProducts.update(productId, {
      $inc: {
        votes: 1
      }
    });
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
    skip: offset + 1,
    limit: 3
  });
});

Meteor.publish('seasonProductList', function({seasonId, sortBy, sortDir, offset}) {
  check(seasonId, String);
  check(sortBy, new Match.OneOf('votes', 'type', 'companyName'));
  check(sortDir, new Match.OneOf(1, -1));
  check(offset, Match.Integer);

  let initialized = false;
  let total = dbProducts
    .find({seasonId})
    .count();
  this.added('variables', 'totalCountOfProductList', {
    value: total
  });

  const observer = dbProducts
    .find({seasonId}, {
      sort: {
        [sortBy]: sortDir
      },
      skip: offset,
      limit: 30
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('products', id, fields);
        if (initialized) {
          total += 1;
          this.changed('variables', 'totalCountOfProductList', {
            value: total
          });
        }
      },
      removed: (id) => {
        this.removed('products', id);
        if (initialized) {
          total -= 1;
          this.changed('variables', 'totalCountOfProductList', {
            value: total
          });
        }
      }
    });
  initialized = true;
  this.ready();
  this.onStop(() => {
    observer.stop();
  });
});