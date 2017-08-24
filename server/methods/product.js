'use strict';
import url from 'url';
import querystring from 'querystring';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { WebApp } from 'meteor/webapp';
import { resourceManager } from '../resourceManager';
import { dbDirectors } from '../../db/dbDirectors';
import { dbProducts } from '../../db/dbProducts';
import { dbProductLike } from '../../db/dbProductLike';
import { dbCompanies } from '../../db/dbCompanies';
import { dbSeason } from '../../db/dbSeason';
import { dbLog } from '../../db/dbLog';

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
  const companyId = productData.companyId;
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      manager: 1
    }
  });
  if (companyData.manager !== user._id) {
    throw new Meteor.Error(401, '登入使用者並非註冊的公司經理人！');
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
  const productData = dbProducts.findOne(productId);
  if (! productData) {
    throw new Meteor.Error(404, '不存在的產品！');
  }
  const companyId = productData.companyId;
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      manager: 1
    }
  });
  if (companyData.manager !== user._id) {
    throw new Meteor.Error(401, '登入使用者並非註冊的公司經理人！');
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
  const seasonData = dbSeason.findOne({}, {
    sort: {
      beginDate: -1
    }
  });
  if (! seasonData) {
    throw new Meteor.Error(500, '商業季度尚未開始！');
  }
  const companyId = productData.companyId;
  const votePrice = seasonData.votePrice;
  const userId = user._id;
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
    dbLog.insert({
      logType: '推薦產品',
      userId: [userId],
      companyId: companyId,
      productId: productId,
      price: votePrice,
      createdAt: new Date()
    });
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
        votes: 1
      }
    });
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
  const productData = dbProducts.findOne(productId);
  if (! productData) {
    throw new Meteor.Error(404, '不存在的產品！');
  }
  const companyId = productData.companyId;
  const userId = user._id;
  if (dbDirectors.find({companyId, userId}).count() < 1) {
    throw new Meteor.Error(401, '至少需要擁有一張的股票才可做出股東評價！');
  }
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

//以Ajax方式發布產品名稱、連結
WebApp.connectHandlers.use(function(req, res, next) {
  const parsedUrl = url.parse(req.url);
  if (parsedUrl.pathname === '/productName') {
    const query = querystring.parse(parsedUrl.query);
    const productId = query.id;
    const productData = dbProducts.findOne(productId, {
      fields: {
        productName: 1,
        url: 1
      }
    });
    if (productData) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.end(JSON.stringify(productData));
    }
    else {
      res.writeHead(404, {
        'Content-Type': 'text/plain'
      });
      res.write('404 Not Found\n');
      res.end();
    }
  }
  else {
    next();
  }
});

Meteor.publish('productListBySeasonId', function({seasonId, sortBy, sortDir, offset}) {
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

Meteor.publish('productListByCompany', function({companyId, sortBy, sortDir, offset}) {
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

Meteor.publish('queryMyLikeProduct', function(companyId) {
  check(companyId, String);
  const userId = this.userId;
  if (userId) {
    return dbProductLike.find({companyId, userId}, {
      fields: {
        productName: 0,
        url: 0
      }
    });
  }
  else {
    return [];
  }
});
