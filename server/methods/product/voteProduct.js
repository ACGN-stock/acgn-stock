import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { resourceManager } from '/server/imports/resourceManager';
import { dbProducts } from '/db/dbProducts';
import { dbProductLike } from '/db/dbProductLike';
import { dbCompanies } from '/db/dbCompanies';
import { dbSeason } from '/db/dbSeason';
import { dbLog } from '/db/dbLog';
import { dbVoteRecord } from '/db/dbVoteRecord';
import { limitMethod } from '/server/imports/rateLimit';
import { debug } from '/server/imports/debug';

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
  if (user.profile.isInVacation) {
    throw new Meteor.Error(403, '您現在正在渡假中，請好好放鬆！');
  }
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
      data: {
        productId: productId,
        profit: votePrice
      },
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
    if (dbProductLike.find({productId, userId}).count() > 0) {
      dbProducts.update(productId, {
        $inc: {
          votes: 1
        }
      });
    }
    else {
      dbProducts.update(productId, {
        $inc: {
          votes: 1,
          likeCount: 1
        }
      });
      dbProductLike.insert({productId, companyId, userId});
    }
    release();
  });
}
//一秒鐘最多一次
limitMethod('voteProduct', 1, 1000);
