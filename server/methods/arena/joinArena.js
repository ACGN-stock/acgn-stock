import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbArena } from '/db/dbArena';
import { dbArenaFighters } from '/db/dbArenaFighters';
import { dbCompanies } from '/db/dbCompanies';
import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  joinArena(companyId) {
    check(this.userId, String);
    check(companyId, String);
    joinArena(Meteor.user(), companyId);

    return true;
  }
});
function joinArena(user, companyId) {
  debug.log('joinArena', { user, companyId });
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      companyName: 1,
      manager: 1,
      isSeal: 1,
      createdAt: 1
    }
  });
  if (! companyData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + companyId + '」的公司！');
  }
  if (companyData.isSeal) {
    throw new Meteor.Error(403, '「' + companyData.companyName + '」公司已被金融管理委員會查封關停了！');
  }
  const userId = user._id;
  if (userId !== companyData.manager) {
    throw new Meteor.Error(401, '使用者並非該公司的經理人！');
  }
  const lastArenaData = dbArena.findOne({}, {
    sort: {
      beginDate: -1
    },
    fields: {
      _id: 1,
      endDate: 1
    }
  });
  if (! lastArenaData) {
    throw new Meteor.Error(403, '現在並沒有舉辦最萌亂鬥大賽！');
  }
  if (Date.now() >= lastArenaData.endDate.getTime()) {
    throw new Meteor.Error(403, '這一屆最萌亂鬥大賽的報名時間已過，下回請早！');
  }
  const arenaId = lastArenaData._id;
  if (dbArenaFighters.findOne({ arenaId, companyId })) {
    throw new Meteor.Error(403, '「' + companyData.companyName + '」公司已經報名參加這一屆最萌亂鬥大賽了，無法重複報名！');
  }
  resourceManager.throwErrorIsResourceIsLock(['season', 'arena' + companyId]);
  // 先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('joinArena', ['arena' + companyId], (release) => {
    if (dbArenaFighters.findOne({ arenaId, companyId })) {
      throw new Meteor.Error(403, '「' + companyData.companyName + '」公司已經報名參加這一屆最萌亂鬥大賽了，無法重複報名！');
    }
    dbLog.insert({
      logType: '亂鬥報名',
      userId: [userId],
      companyId: companyId,
      createdAt: new Date()
    });
    const manager = userId;
    const createdAt = companyData.createdAt;
    const attackSequence = [];
    dbArenaFighters.insert({ arenaId, companyId, manager, createdAt, attackSequence });
    release();
  });
}
