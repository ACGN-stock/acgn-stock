import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';
import { limitMethod } from '/server/imports/utils/rateLimit';

// 可購買的石頭類型
const buyableStoneTypeList = Object.keys(Meteor.settings.public.stonePrice);

Meteor.methods({
  buyStone({ stoneType, amount }) {
    check(this.userId, String);
    check(stoneType, new Match.OneOf(...buyableStoneTypeList));
    check(amount, Match.Integer);
    buyStone({ userId: this.userId, stoneType, amount });

    return true;
  }
});

export function buyStone({ userId, stoneType, amount }, resourceLocked = false) {
  debug.log('buyStone', { userId, stoneType, amount });

  const user = Meteor.users.findOne({ _id: userId }, {
    fields: {
      'profile.isInVacation': 1,
      'profile.money': 1
    }
  });

  if (! user) {
    throw new Meteor.Error(404, `找不到識別碼為 ${userId} 的使用者！`);
  }

  if (user.profile.isInVacation) {
    throw new Meteor.Error(403, '您現在正在渡假中，請好好放鬆！');
  }

  const stonePrice = Meteor.settings.public.stonePrice[stoneType];
  const cost = amount * stonePrice;
  if (user.profile.money < cost) {
    throw new Meteor.Error(403, '剩餘金錢不足！');
  }

  if (! resourceLocked) {
    resourceManager.throwErrorIsResourceIsLock([`user${userId}`]);
    // 先鎖定資源，再重跑一次 function 進行運算
    resourceManager.request('buyStone', [`user${userId}`], (release) => {
      buyStone({ userId, stoneType, amount }, true);
      release();
    });

    return;
  }

  Meteor.users.update(userId, {
    $inc: {
      'profile.money': -cost,
      [`profile.stones.${stoneType}`]: amount
    }
  });
  dbLog.insert({
    logType: '購買得石',
    userId: [userId],
    data: { stoneType, cost, amount },
    createdAt: new Date()
  });
}

limitMethod('buyStone');
