import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbAdvertising } from '/db/dbAdvertising';
import { dbLog } from '/db/dbLog';
import { resourceManager } from '/server/imports/threading/resourceManager';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  buyAdvertising(advertisingData) {
    check(this.userId, String);
    check(advertisingData, {
      paid: Match.Integer,
      message: String,
      url: new Match.Optional(String)
    });
    buyAdvertising(Meteor.user(), advertisingData);

    return true;
  }
});
function buyAdvertising(user, advertisingData) {
  debug.log('buyAdvertising', { user, advertisingData });
  if (user.profile.isInVacation) {
    throw new Meteor.Error(403, '您現在正在渡假中，請好好放鬆！');
  }
  if (_.contains(user.profile.ban, 'advertise')) {
    throw new Meteor.Error(403, '您現在被金融管理會禁止了所有廣告宣傳行為！');
  }
  if (user.profile.notPayTax) {
    throw new Meteor.Error(403, '您現在有稅單逾期未繳！');
  }
  if (advertisingData.paid < 1) {
    throw new Meteor.Error(403, '廣告費用額度錯誤！');
  }
  const minimumPaid = (
    (advertisingData.url ? 100 : 0) +
    advertisingData.message.length
  );
  if (advertisingData.paid < minimumPaid) {
    throw new Meteor.Error(403, '廣告費用額度錯誤！');
  }
  if (user.profile.money < advertisingData.paid) {
    throw new Meteor.Error(403, '剩餘金錢不足，無法購買廣告！');
  }
  const userId = user._id;
  resourceManager.throwErrorIsResourceIsLock(['user' + userId]);
  // 先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('buyAdvertising', ['user' + userId], (release) => {
    const user = Meteor.users.findOne(userId, {
      fields: {
        profile: 1
      }
    });
    if (user.profile.money < advertisingData.paid) {
      throw new Meteor.Error(403, '剩餘金錢不足，無法購買廣告！');
    }
    const createdAt = new Date();
    dbLog.insert({
      logType: '廣告宣傳',
      userId: [userId],
      data: {
        cost: advertisingData.paid,
        message: advertisingData.message
      },
      createdAt: createdAt
    });
    Meteor.users.update(user._id, {
      $inc: {
        'profile.money': advertisingData.paid * -1
      }
    });
    dbAdvertising.insert({
      userId: userId,
      paid: advertisingData.paid,
      message: advertisingData.message,
      url: advertisingData.url,
      createdAt: createdAt
    });
    release();
  });
}
