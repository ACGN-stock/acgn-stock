import { _ } from 'meteor/underscore';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbCompanies } from '/db/dbCompanies';
import { dbLog } from '/db/dbLog';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { resourceManager } from '/server/imports/threading/resourceManager';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  resignManager(companyId) {
    check(this.userId, String);
    check(companyId, String);
    resignManager(Meteor.user(), companyId);

    return true;
  }
});
export function resignManager(user, companyId) {
  debug.log('resignManager', { user, companyId });
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      companyName: 1,
      manager: 1,
      isSeal: 1
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
  resourceManager.throwErrorIsResourceIsLock(['season', 'elect', 'elect' + companyId]);
  // 先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('resignManager', ['elect' + companyId], (release) => {
    const companyData = dbCompanies.findOne(companyId, {
      fields: {
        manager: 1,
        candidateList: 1,
        voteList: 1
      }
    });
    if (userId !== companyData.manager) {
      throw new Meteor.Error(401, '使用者並非該公司的經理人！');
    }
    const { candidateList, voteList } = companyData;
    const candidateIndex = _.indexOf(candidateList, userId);
    if (candidateIndex !== -1) {
      candidateList.splice(candidateIndex, 1);
      voteList.splice(candidateIndex, 1);
    }
    dbLog.insert({
      logType: '辭職紀錄',
      userId: [userId],
      companyId: companyId,
      createdAt: new Date()
    });
    dbCompanies.update(companyId, {
      $set: {
        manager: '!none',
        candidateList: candidateList,
        voteList: voteList
      }
    });
    release();
  });
}
limitMethod('resignManager');
