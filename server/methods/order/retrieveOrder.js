import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbDirectors } from '/db/dbDirectors';
import { dbOrders } from '/db/dbOrders';
import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  retrieveOrder(orderId) {
    check(this.userId, String);
    check(orderId, String);
    retrieveOrder(Meteor.user(), orderId);

    return true;
  }
});
export function retrieveOrder(user, orderId) {
  debug.log('retrieveOrder', { user, orderId });
  if (user.profile.isInVacation) {
    throw new Meteor.Error(403, '您現在正在渡假中，請好好放鬆！');
  }
  if (user.profile.money < 1) {
    throw new Meteor.Error(403, '無法支付手續費1元，撤回訂單失敗！');
  }
  const orderData = dbOrders.findOne(orderId);
  if (! orderData) {
    throw new Meteor.Error(404, '訂單已完成或已撤回，撤回訂單失敗！');
  }
  const userId = user._id;
  if (userId !== orderData.userId) {
    throw new Meteor.Error(401, '該訂單並非使用者所有，撤回訂單失敗！');
  }
  const companyId = orderData.companyId;
  resourceManager.throwErrorIsResourceIsLock(['season', 'allCompanyOrders', `companyOrder${companyId}`, `user${userId}`]);
  // 先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('retrieveOrder', [`companyOrder${companyId}`, `user${userId}`], (release) => {
    const user = Meteor.users.findOne(userId, {
      fields: {
        profile: 1
      }
    });
    if (user.profile.money < 1) {
      throw new Meteor.Error(403, '無法支付手續費1元，撤回訂單失敗！');
    }
    const orderData = dbOrders.findOne(orderId);
    if (! orderData) {
      throw new Meteor.Error(404, '訂單已完成或已撤回，撤回訂單失敗！');
    }
    const leftAmount = orderData.amount - orderData.done;
    const createdAt = new Date();
    dbLog.insert({
      logType: '取消下單',
      userId: [userId],
      companyId: companyId,
      data: {
        orderType: orderData.orderType,
        price: orderData.unitPrice,
        amount: leftAmount
      },
      createdAt: createdAt
    });
    let increaseMoney = -1;
    if (orderData.orderType === '購入') {
      increaseMoney += (orderData.unitPrice * (orderData.amount - orderData.done));
    }
    else {
      const existsDirectorsData = dbDirectors.findOne({ companyId, userId }, {
        fields: {
          _id: 1
        }
      });
      if (existsDirectorsData) {
        dbDirectors.update(existsDirectorsData._id, {
          $inc: {
            stocks: leftAmount
          }
        });
      }
      else {
        dbDirectors.insert({
          companyId: companyId,
          userId: userId,
          stocks: leftAmount,
          createdAt: createdAt
        });
      }
    }
    Meteor.users.update(userId, {
      $inc: {
        'profile.money': increaseMoney
      }
    });
    dbOrders.remove(orderData._id);
    release();
  });
}
