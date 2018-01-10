import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbProducts } from '/db/dbProducts';
import { dbCompanies } from '/db/dbCompanies';
import { dbLog } from '/db/dbLog';
import { dbVoteRecord } from '/db/dbVoteRecord';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { guardUser, guardCompany, guardProduct } from '/common/imports/guards';

Meteor.methods({
  voteProduct(productId) {
    check(this.userId, String);
    check(productId, String);
    voteProduct({ userId: this.userId, productId });

    return true;
  }
});

export function voteProduct({ userId, productId }, resourceLocked = false) {
  debug.log('voteProduct', { userId, productId });

  const user = Meteor.users.findByIdOrThrow(userId);

  guardUser(user)
    .checkNotBanned('deal')
    .checkNotInVacation()
    .checkNoExpiredTaxes()
    .checkHasVoteTickets();

  const productData = dbProducts.findByIdOrThrow(productId, { fields: { companyId: 1, state: 1 } });

  guardProduct(productData).checkInState('marketing');

  const { companyId } = productData;
  const companyData = dbCompanies.findByIdOrThrow(companyId, { fields: { companyName: 1, isSeal: 1 } });

  guardCompany(companyData).checkNotSealed();

  if (dbVoteRecord.find({ companyId, userId }).count() > 0) {
    throw new Meteor.Error(403, '使用者已在本季度對該公司的產品投過推薦票，無法繼續對同一家公司的產品投推薦票！');
  }

  if (! resourceLocked) {
    resourceManager.throwErrorIsResourceIsLock(['season', `user${userId}`]);

    // 先鎖定資源，再重新跑一次 function 進行運算
    resourceManager.request('voteProduct', [`user${userId}`], (release) => {
      voteProduct({ userId, productId }, true);
      release();
    });

    return;
  }

  dbLog.insert({
    logType: '推薦產品',
    userId: [userId],
    companyId,
    data: { productId },
    createdAt: new Date()
  });

  dbVoteRecord.insert({ companyId, userId });
  Meteor.users.update(userId, { $inc: { 'profile.voteTickets': -1 } });
  dbProducts.update(productId, { $inc: { voteCount: 1 } });
}
// 一秒鐘最多一次
limitMethod('voteProduct', 1, 1000);
