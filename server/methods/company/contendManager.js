import { _ } from 'meteor/underscore';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { getCurrentSeason } from '/db/dbSeason';
import { dbCompanies } from '/db/dbCompanies';
import { dbLog } from '/db/dbLog';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { resourceManager } from '/server/imports/threading/resourceManager';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  contendManager(companyId) {
    check(this.userId, String);
    check(companyId, String);
    contendManager(Meteor.user(), companyId);

    return true;
  }
});
export function contendManager(user, companyId) {
  debug.log('contendManager', { user, companyId });
  const { contendManagerEndTime, electManagerTime } = Meteor.settings.public;
  const { endDate: seasonEndDate } = getCurrentSeason();

  const contendManagerEndTimePassed = seasonEndDate.getTime() - Date.now() < contendManagerEndTime;
  const electManagerTimePassed = seasonEndDate.getTime() - Date.now() < electManagerTime;

  // 在經理參選報名截止後，至經理完成選舉之前，禁止參選
  if (contendManagerEndTimePassed && ! electManagerTimePassed) {
    throw new Meteor.Error(403, '本次經理選舉報名時間已過！');
  }

  if (user.profile.isInVacation) {
    throw new Meteor.Error(403, '您現在正在渡假中，請好好放鬆！');
  }
  if (user.profile.notPayTax) {
    throw new Meteor.Error(403, '您現在有稅單逾期未繳！');
  }
  if (_.contains(user.profile.ban, 'manager')) {
    throw new Meteor.Error(403, '您現在被金融管理會禁止了擔任經理人的資格！');
  }
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      companyName: 1,
      manager: 1,
      candidateList: 1,
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
  if (userId === companyData.manager) {
    throw new Meteor.Error(403, '使用者已經是該公司的經理人了！');
  }
  const candidateList = companyData.candidateList;
  if (_.contains(candidateList, userId)) {
    throw new Meteor.Error(403, '使用者已經是該公司的經理人候選者了！');
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
    if (userId === companyData.manager) {
      throw new Meteor.Error(403, '使用者已經是該公司的經理人了！');
    }
    const candidateList = companyData.candidateList;
    if (_.contains(candidateList, userId)) {
      throw new Meteor.Error(403, '使用者已經是該公司的經理人候選者了！');
    }
    const voteList = companyData.voteList;
    candidateList.push(userId);
    voteList.push([]);
    dbLog.insert({
      logType: '參選紀錄',
      userId: [userId],
      companyId: companyId,
      createdAt: new Date()
    });
    dbCompanies.update(companyId, {
      $set: {
        candidateList: candidateList,
        voteList: voteList
      }
    });
    release();
  });
}
limitMethod('contendManager');
