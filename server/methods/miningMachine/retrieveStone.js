import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbCompanyStones } from '/db/dbCompanyStones';
import { dbSeason } from '/db/dbSeason';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { resourceManager } from '/server/imports/threading/resourceManager';

Meteor.methods({
  retrieveStone({ companyId }) {
    check(this.userId, String);
    check(companyId, String);
    retrieveStone({ userId: this.userId, companyId });

    return true;
  }
});

export function retrieveStone({ userId, companyId }, resourceLocked = false) {
  debug.log('retrieveStone', { userId, companyId });

  const { miningMachineOperationTime } = Meteor.settings.public;

  const currentSeason = dbSeason.findOne({}, { sort: { beginDate: -1 } });

  if (currentSeason.endDate.getTime() - Date.now() <= miningMachineOperationTime) {
    throw new Meteor.Error(403, '現在是挖礦機運轉時間，無法放石！');
  }

  const user = Meteor.users.findOne({ _id: userId });
  if (! user) {
    throw new Meteor.Error(404, `找不到識別碼為 ${userId} 的使用者！`);
  }

  const companyStoneData = dbCompanyStones.findOne({ userId, companyId });
  if (! companyStoneData) {
    throw new Meteor.Error(403, '您並未在此公司放置石頭！');
  }

  if (! resourceLocked) {
    // 先鎖定資源，再重新跑一次 function 進行運算
    resourceManager.request('placeStone', [`company${companyId}`, `user${userId}`], (release) => {
      retrieveStone({ userId, companyId }, true);
      release();
    });

    return;
  }

  const { _id: companyStoneId, stoneType } = companyStoneData;

  dbCompanyStones.remove(companyStoneId);
  Meteor.users.update(userId, { $inc: { [`profile.stones.${stoneType}`]: 1 } });
}

limitMethod('retrieveStone');
