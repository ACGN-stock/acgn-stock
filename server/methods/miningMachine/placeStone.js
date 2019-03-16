import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbCompanyStones, stoneTypeList, stoneDisplayName } from '/db/dbCompanyStones';
import { dbSeason } from '/db/dbSeason';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { resourceManager } from '/server/imports/threading/resourceManager';

Meteor.methods({
  placeStone({ companyId, stoneType }) {
    check(this.userId, String);
    check(companyId, String);
    check(stoneType, new Match.OneOf(...stoneTypeList));
    placeStone({ userId: this.userId, companyId, stoneType });

    return true;
  }
});

export function placeStone({ userId, companyId, stoneType }, resourceLocked = false) {
  debug.log('placeStone', { userId, companyId, stoneType });

  const { miningMachineOperationTime } = Meteor.settings.public;

  const currentSeason = dbSeason.findOne({}, { sort: { beginDate: -1 } });

  if (currentSeason.endDate.getTime() - Date.now() <= miningMachineOperationTime) {
    throw new Meteor.Error(403, '現在是挖礦機運轉時間，無法放石！');
  }

  const user = Meteor.users.findOne({ _id: userId });
  if (! user) {
    throw new Meteor.Error(404, `找不到識別碼為 ${userId} 的使用者！`);
  }

  if (dbCompanyStones.find({ userId, companyId }).count() > 0) {
    throw new Meteor.Error(403, '您已經在同一家公司投入過石頭了！');
  }

  const availableStones = user.profile.stones[stoneType] || 0;
  if (availableStones < 1) {
    throw new Meteor.Error(403, `${stoneDisplayName(stoneType)}的數量不足！`);
  }

  if (! resourceLocked) {
    // 先鎖定資源，再重新跑一次 function 進行運算
    resourceManager.request('placeStone', [`company${companyId}`, `user${userId}`], (release) => {
      placeStone({ userId, companyId, stoneType }, true);
      release();
    });

    return;
  }

  dbCompanyStones.insert({ userId, companyId, stoneType, placedAt: new Date() });
  Meteor.users.update(userId, { $inc: { [`profile.stones.${stoneType}`]: -1 } });
}

limitMethod('placeStone');
