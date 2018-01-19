import { _ } from 'meteor/underscore';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbCompanies } from '/db/dbCompanies';
import { dbDirectors } from '/db/dbDirectors';
import { dbLog } from '/db/dbLog';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { resourceManager } from '/server/imports/threading/resourceManager';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  supportCandidate(companyId, supportUserId) {
    check(this.userId, String);
    check(companyId, String);
    check(supportUserId, String);
    supportCandidate(Meteor.user(), companyId, supportUserId);

    return true;
  }
});
export function supportCandidate(user, companyId, supportUserId) {
  debug.log('supportCandidate', { user, companyId, supportUserId });
  if (user.profile.isInVacation) {
    throw new Meteor.Error(403, '您現在正在渡假中，請好好放鬆！');
  }
  if (user.profile.notPayTax) {
    throw new Meteor.Error(403, '您現在有稅單逾期未繳！');
  }
  if (_.contains(user.profile.ban, 'deal')) {
    throw new Meteor.Error(403, '您現在被金融管理會禁止了所有投資下單行為！');
  }
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      companyName: 1,
      manager: 1,
      candidateList: 1,
      voteList: 1,
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
  const directorDataCount = dbDirectors
    .find({
      companyId: companyId,
      userId: userId
    })
    .count();
  if (directorDataCount < 1) {
    throw new Meteor.Error(401, '使用者並非「' + companyData.companyName + '」公司的董事，無法支持經理人！');
  }
  const { companyName, candidateList, voteList } = companyData;
  const candidateIndex = _.indexOf(candidateList, supportUserId);
  if (candidateIndex === -1) {
    throw new Meteor.Error(403, '使用者' + supportUserId + '並未競爭「' + companyName + '」公司經理人，無法進行支持！');
  }
  if (_.contains(voteList[candidateIndex], userId)) {
    throw new Meteor.Error(403, '使用者已經正在支持使用者' + supportUserId + '擔任「' + companyName + '」公司經理人了，無法再次進行支持！');
  }
  resourceManager.throwErrorIsResourceIsLock(['season', 'elect', 'elect' + companyId, 'user' + userId]);
  // 先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('resignManager', ['elect' + companyId, 'user' + userId], (release) => {
    const companyData = dbCompanies.findOne(companyId, {
      fields: {
        companyName: 1,
        manager: 1,
        candidateList: 1,
        voteList: 1
      }
    });
    const directorDataCount = dbDirectors
      .find({
        companyId: companyId,
        userId: userId
      })
      .count();
    if (directorDataCount < 1) {
      throw new Meteor.Error(401, '使用者並非「' + companyData.companyName + '」公司的董事，無法支持經理人！');
    }
    const { companyName, candidateList, voteList } = companyData;
    const candidateIndex = _.indexOf(candidateList, supportUserId);
    if (candidateIndex === -1) {
      throw new Meteor.Error(403, '使用者' + supportUserId + '並未競爭「' + companyName + '」公司經理人，無法進行支持！');
    }
    if (_.contains(voteList[candidateIndex], userId)) {
      throw new Meteor.Error(403, '使用者已經正在支持使用者' + supportUserId + '擔任「' + companyName + '」公司經理人了，無法再次進行支持！');
    }
    const newVoteList = _.map(voteList, (votes) => {
      return _.without(votes, userId);
    });
    newVoteList[candidateIndex].push(userId);

    dbLog.insert({
      logType: '支持紀錄',
      userId: [userId, supportUserId],
      companyId: companyId,
      createdAt: new Date()
    });
    dbCompanies.update(companyId, {
      $set: {
        voteList: newVoteList
      }
    });
    release();
  });
}
limitMethod('supportCandidate');
