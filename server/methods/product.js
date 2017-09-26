'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { resourceManager } from '../resourceManager';
import { dbProducts } from '../../db/dbProducts';
import { dbProductLike } from '../../db/dbProductLike';
import { dbCompanies } from '../../db/dbCompanies';
import { dbSeason } from '../../db/dbSeason';
import { dbLog } from '../../db/dbLog';
import { dbVoteRecord } from '../../db/dbVoteRecord';
import { limitSubscription } from './rateLimit';
import { debug } from '../debug';

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
  if (companyData.manager !== user._id) {
    throw new Meteor.Error(401, '登入使用者並非註冊的公司經理人！');
  }
  if (companyData.isSeal) {
    throw new Meteor.Error(403, '「' + companyData.companyName + '」公司已被金融管理委員會查封關停了！');
  }
  const url = productData.url;
  if (dbProducts.find({companyId, url}).count() > 0) {
    throw new Meteor.Error(403, '相同的產品已經被推出過了！');
  }
  resourceManager.throwErrorIsResourceIsLock(['season']);
  const seasonData = dbSeason.findOne({}, {
    sort: {
      beginDate: -1
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
  if (companyData.manager !== user._id) {
    throw new Meteor.Error(401, '登入使用者並非註冊的公司經理人！');
  }
  if (companyData.isSeal) {
    throw new Meteor.Error(403, '「' + companyData.companyName + '」公司已被金融管理委員會查封關停了！');
  }
  resourceManager.throwErrorIsResourceIsLock(['season']);
  dbProducts.remove(productId);
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
  debug.log('voteProduct', {user, productId});
  if (user.profile.notPayTax) {
    throw new Meteor.Error(403, '您現在有稅單逾期未繳！');
  }
  if (_.contains(user.profile.ban, 'deal')) {
    throw new Meteor.Error(403, '您現在被金融管理會禁止了所有投資下單行為！');
  }
  if (user.profile.vote < 1) {
    throw new Meteor.Error(403, '使用者已經沒有多餘的推薦票可以推薦！');
  }
  const productData = dbProducts.findOne(productId, {
    fields: {
      companyId: 1,
      overdue: 1
    }
  });
  if (! productData) {
    throw new Meteor.Error(404, '不存在的產品！');
  }
  if (productData.overdue !== 1) {
    throw new Meteor.Error(401, '該產品的投票截止日期已經超過了！');
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
  if (dbVoteRecord.find({companyId, userId}).count() > 0) {
    throw new Meteor.Error(403, '使用者已在本季度對該公司的產品投過推薦票，無法繼續對同一家公司的產品投推薦票！');
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
  resourceManager.throwErrorIsResourceIsLock(['season', 'companyProfit' + companyId, 'user' + userId]);
  //先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('voteProduct', ['companyProfit' + companyId, 'user' + userId], (release) => {
    const user = Meteor.users.findOne(userId, {
      fields: {
        profile: 1
      }
    });
    if (user.profile.vote < 1) {
      throw new Meteor.Error(403, '使用者已經沒有多餘的推薦票可以推薦！');
    }
    if (dbVoteRecord.find({companyId, userId}).count() > 0) {
      throw new Meteor.Error(403, '使用者已在本季度對該公司的產品投過推薦票，無法繼續對同一家公司的產品投推薦票！');
    }
    dbLog.insert({
      logType: '推薦產品',
      userId: [userId],
      companyId: companyId,
      productId: productId,
      price: votePrice,
      createdAt: new Date()
    });
    dbVoteRecord.insert({companyId, userId});
    Meteor.users.update(userId, {
      $inc: {
        'profile.vote': -1
      }
    });
    dbCompanies.update(companyId, {
      $inc: {
        profit: votePrice
      }
    });
    dbProducts.update(productId, {
      $inc: {
        votes: 1,
        likeCount: 1
      }
    });
    dbProductLike.insert({productId, companyId, userId});
    release();
  });
}

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

Meteor.publish('productListBySeasonId', function({seasonId, sortBy, sortDir, offset}) {
  debug.log('publish productListBySeasonId', {seasonId, sortBy, sortDir, offset});
  check(seasonId, String);
  check(sortBy, new Match.OneOf('votes', 'type', 'companyName'));
  check(sortDir, new Match.OneOf(1, -1));
  check(offset, Match.Integer);

  let initialized = false;
  let total = dbProducts
    .find({
      seasonId: seasonId,
      overdue: {
        $gt: 0
      }
    })
    .count();
  this.added('variables', 'totalCountOfProductList', {
    value: total
  });

  const observer = dbProducts
    .find(
      {
        seasonId: seasonId,
        overdue: {
          $gt: 0
        }
      },
      {
        fields: {
          productName: 0,
          url: 0
        },
        sort: {
          [sortBy]: sortDir
        },
        skip: offset,
        limit: 30,
        disableOplog: true
      }
    )
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
      changed: (id, fields) => {
        this.changed('products', id, fields);
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
//一分鐘最多重複訂閱10次
limitSubscription('allAdvertising', 10);

Meteor.publish('productListByCompany', function({companyId, sortBy, sortDir, offset}) {
  debug.log('publish productListByCompany', {companyId, sortBy, sortDir, offset});
  check(companyId, String);
  check(sortBy, new Match.OneOf('likeCount', 'votes', 'type'));
  check(sortDir, new Match.OneOf(1, -1));
  check(offset, Match.Integer);

  let initialized = false;
  let total = dbProducts
    .find({
      companyId: companyId,
      overdue: {
        $gt: 0
      }
    })
    .count();
  this.added('variables', 'totalCountOfProductList', {
    value: total
  });

  const observer = dbProducts
    .find(
      {
        companyId: companyId,
        overdue: {
          $gt: 0
        }
      },
      {
        fields: {
          productName: 0,
          url: 0
        },
        sort: {
          [sortBy]: sortDir
        },
        skip: offset,
        limit: 10,
        disableOplog: true
      }
    )
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
      changed: (id, fields) => {
        this.changed('products', id, fields);
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
//一分鐘最多20次
limitSubscription('productListByCompany');

Meteor.publish('queryMyLikeProduct', function(companyId) {
  debug.log('publish queryMyLikeProduct', companyId);
  check(companyId, String);
  const userId = this.userId;

  if (userId) {
    return [
      dbProductLike.find({companyId, userId}, {
        fields: {
          productName: 0,
          url: 0
        }
      }),
      dbVoteRecord.find({companyId, userId})
    ];
  }
  else {
    return [];
  }
});
//十秒中最多30次(產品中心)
limitSubscription('queryMyLikeProduct', 30, 10000);

Meteor.publish('companyCurrentProduct', function(companyId) {
  debug.log('publish companyCurrentProduct', companyId);
  check(companyId, String);
  const overdue = 1;
  const disableOplog = true;

  return dbProducts.find({companyId, overdue}, {disableOplog});
});
//一分鐘最多20次
limitSubscription('companyCurrentProduct');
