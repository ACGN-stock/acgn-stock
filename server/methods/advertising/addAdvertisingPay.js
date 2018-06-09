import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbAdvertising } from '/db/dbAdvertising';
import { dbLog } from '/db/dbLog';
import { resourceManager } from '/server/imports/threading/resourceManager';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  addAdvertisingPay(advertisingId, addPay) {
    check(this.userId, String);
    check(advertisingId, String);
    check(addPay, Match.Integer);
    addAdvertisingPay(Meteor.user(), advertisingId, addPay);

    return true;
  }
});
function addAdvertisingPay(user, advertisingId, addPay) {
  debug.log('addAdvertisingPay', { user, advertisingId, addPay });
  if (user.profile.isInVacation) {
    throw new Meteor.Error(403, '您現在正在渡假中，請好好放鬆！');
  }
  if (_.contains(user.profile.ban, 'advertise')) {
    throw new Meteor.Error(403, '您現在被金融管理會禁止了所有廣告宣傳行為！');
  }
  if (user.profile.notPayTax) {
    throw new Meteor.Error(403, '您現在有稅單逾期未繳！');
  }
  if (addPay < 1) {
    throw new Meteor.Error(403, '追加費用額度錯誤！');
  }
  if (user.profile.money < addPay) {
    throw new Meteor.Error(403, '剩餘金錢不足，無法追加廣告費用！');
  }
  const advertisingData = dbAdvertising.findOne(advertisingId, {
    fields: {
      userId: 1,
      message: 1
    }
  });
  if (! advertisingData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + advertisingId + '」的廣告！');
  }
  const userId = user._id;
  resourceManager.throwErrorIsResourceIsLock(['user' + userId]);
  // 先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('addAdvertisingPay', ['user' + userId], (release) => {
    const user = Meteor.users.findOne(userId, {
      fields: {
        profile: 1
      }
    });
    if (user.profile.money < addPay) {
      throw new Meteor.Error(403, '剩餘金錢不足，無法追加廣告費用！');
    }
    const createdAt = new Date();
    dbLog.insert({
      logType: '廣告追加',
      userId: [userId, advertisingData.userId],
      data: {
        cost: addPay,
        message: advertisingData.message
      },
      createdAt: createdAt
    });
    Meteor.users.update(userId, {
      $inc: {
        'profile.money': addPay * -1
      }
    });
    dbAdvertising.update(advertisingId, {
      $inc: {
        paid: addPay
      }
    });
    release();
  });
}
