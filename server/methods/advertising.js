'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { resourceManager } from '../resourceManager';
import { check, Match } from 'meteor/check';
import { dbAdvertising } from '../../db/dbAdvertising';
import { dbLog } from '../../db/dbLog';
import { config } from '../../config';
import { limitSubscription } from './rateLimit';
import { debug } from '../debug';

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
  debug.log('buyAdvertising', {user, advertisingData});
  if (_.contains(user.profile.ban, 'advertise')) {
    throw new Meteor.Error(403, '您現在被金融管理會禁止了所有廣告宣傳行為！');
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
  //先鎖定資源，再重新讀取一次資料進行運算
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
      price: advertisingData.paid,
      message: advertisingData.message,
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
  debug.log('addAdvertisingPay', {user, advertisingId, addPay});
  if (_.contains(user.profile.ban, 'advertise')) {
    throw new Meteor.Error(403, '您現在被金融管理會禁止了所有廣告宣傳行為！');
  }
  if (addPay < 1) {
    throw new Meteor.Error(403, '追加費用額度錯誤！');
  }
  if (user.profile.money < addPay) {
    throw new Meteor.Error(403, '剩餘金錢不足，無法追加廣告費用！');
  }
  const advertisingData = dbAdvertising.findOne(advertisingId, {
    fields: {
      message: 1
    }
  });
  if (! advertisingData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + advertisingId + '」的廣告！');
  }
  const userId = user._id;
  resourceManager.throwErrorIsResourceIsLock(['user' + userId]);
  //先鎖定資源，再重新讀取一次資料進行運算
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
      userId: [userId],
      price: addPay,
      message: advertisingData.message,
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

Meteor.publish('allAdvertising', function() {
  debug.log('publish allAdvertising');

  return dbAdvertising.find({}, {
    disableOplog: true
  });
});
//一分鐘最多重複訂閱10次
limitSubscription('allAdvertising', 10);

Meteor.publish('displayAdvertising', function() {
  debug.log('publish displayAdvertising');

  return dbAdvertising.find({}, {
    sort: {
      paid: -1
    },
    limit: config.displayAdvertisingNumber,
    disableOplog: true
  });
});
//一分鐘最多重複訂閱5次
limitSubscription('displayAdvertising', 5);
