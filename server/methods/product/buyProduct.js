import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbProducts } from '/db/dbProducts';
import { dbUserOwnedProducts, getAvailableProductTradeQuota } from '/db/dbUserOwnedProducts';
import { dbVips, roundVipScore } from '/db/dbVips';
import { dbCompanies } from '/db/dbCompanies';
import { dbLog } from '/db/dbLog';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { guardUser, guardCompany, guardProduct } from '/common/imports/guards';

Meteor.methods({
  buyProduct({ productId, amount }) {
    check(this.userId, String);
    check(productId, String);
    check(amount, Match.Integer);
    buyProduct({ userId: this.userId, productId, amount });

    return true;
  }
});

export function buyProduct({ userId, productId, amount }, resourceLocked = false) {
  debug.log('buyProduct', { userId, productId, amount });

  const user = Meteor.users.findByIdOrThrow(userId);

  guardUser(user)
    .checkNotBanned('deal')
    .checkNotInVacation()
    .checkNoExpiredTaxes();

  const product = dbProducts.findByIdOrThrow(productId, {
    fields: { companyId: 1, state: 1, availableAmount: 1, price: 1, seasonId: 1 }
  });

  guardProduct(product)
    .checkInState('marketing')
    .checkHasAvailableAmount(amount);

  const { companyId, seasonId, price } = product;
  const company = dbCompanies.findByIdOrThrow(companyId, {
    fields: { companyName: 1, isSeal: 1, capital: 1 }
  });

  guardCompany(company).checkNotSealed();

  const totalCost = product.price * amount;
  const voucherCost = Math.min(totalCost, user.profile.vouchers);
  const moneyCost = totalCost - voucherCost;

  if (moneyCost) {
    guardUser(user).checkHasMoney(moneyCost);
  }

  const availableQuota = getAvailableProductTradeQuota({ userId, companyId });

  if (availableQuota < totalCost) {
    throw new Meteor.Error(403, '剩餘購買額度不足！');
  }

  if (! resourceLocked) {
    resourceManager.throwErrorIsResourceIsLock(['season', `user${userId}`]);

    // 先鎖定資源，再重新跑一次 function 進行運算
    resourceManager.request('buyProduct', [`user${userId}`, `product${productId}`, `company${companyId}`], (release) => {
      buyProduct({ userId, productId, amount }, true);
      release();
    });

    return;
  }

  const nowTime = Date.now();

  // 取得使用者目前 VIP 狀態
  if (dbVips.find({ companyId, userId }).count() === 0) {
    dbVips.insert({ companyId, userId, createdAt: nowTime });
  }
  const { level: vipLevel, score: oldVipScore } = dbVips.findOne({ companyId, userId });

  // VIP 分數加分
  const { price: priceMin } = dbProducts.findOne({ companyId, seasonId }, { sort: { price: 1 } }, { fields: { price: 1 } });
  const { price: priceMax } = dbProducts.findOne({ companyId, seasonId }, { sort: { price: -1 } }, { fields: { price: 1 } });
  const scoreFactor = priceMin === priceMax ? 1 : 1 + 0.2 * (price - priceMin) / (priceMax - priceMin);
  const scoreIncrease = totalCost * scoreFactor;
  const newVipScore = roundVipScore(oldVipScore + scoreIncrease);
  dbVips.update({ companyId, userId }, { $set: { score: newVipScore } });

  // 購買產品
  const { productProfitFactor } = Meteor.settings.public.vipParameters[vipLevel];
  const profit = totalCost * productProfitFactor;

  dbLog.insert({
    logType: '購買產品',
    userId: [userId],
    companyId,
    data: { productId, amount, voucherCost, moneyCost, profit },
    createdAt: nowTime
  });

  Meteor.users.update(userId, { $inc: {
    'profile.vouchers': -voucherCost,
    'profile.money': -moneyCost
  } });
  dbProducts.update(productId, { $inc: { availableAmount: -amount, profit } });
  dbCompanies.update(companyId, { $inc: { profit } });

  if (dbUserOwnedProducts.find({ productId, userId }).count() > 0) {
    dbUserOwnedProducts.update({ productId, userId }, { $inc: { amount } });
  }
  else {
    dbUserOwnedProducts.insert({
      productId, userId, amount, price, companyId,
      seasonId,
      createdAt: nowTime
    });
  }
}
// 一秒鐘最多一次
limitMethod('buyProduct', 1, 1000);
