import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { dbFoundations } from '/db/dbFoundations';
import { dbViolationCases } from '/db/dbViolationCases';
import { dbLog } from '/db/dbLog';
import { banTypeList } from '/db/users';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';
import { notifyUsersForFscLog } from './helpers';

Meteor.methods({
  banUser({ userId, reason, banType, violationCaseId }) {
    check(this.userId, String);
    check(userId, String);
    check(reason, String);
    check(banType, new Match.OneOf(...banTypeList));
    check(violationCaseId, Match.Optional(String));

    banUser(Meteor.user(), { userId, reason, banType, violationCaseId });

    return true;
  }
});

function banUser(currentUser, { userId, reason, banType, violationCaseId }) {
  debug.log('banUser', { user: currentUser, userId, reason, banType, violationCaseId });

  guardUser(currentUser).checkHasRole('fscMember');

  const targetUser = Meteor.users.findByIdOrThrow(userId, { fields: { 'profile.ban': 1 } });
  const oldBanList = targetUser.profile.ban || [];

  const isAlreadyBanned = oldBanList.includes(banType);
  const shouldBan = ! isAlreadyBanned;

  if (violationCaseId) {
    dbViolationCases.findByIdOrThrow(violationCaseId, { fields: { _id: 1 } });
  }

  if (shouldBan) {
    Meteor.users.update(userId, { $addToSet: { 'profile.ban': banType } });
  }
  else {
    Meteor.users.update(userId, { $pull: { 'profile.ban': banType } });
  }

  const logTypeMap = shouldBan ? {
    accuse: '禁止舉報',
    deal:  '禁止下單',
    chat:  '禁止聊天',
    advertise:  '禁止廣告',
    editUserAbout: '禁止簡介',
    manager:  '禁任經理'
  } : {
    accuse: '解除舉報',
    deal: '解除下單',
    chat: '解除聊天',
    advertise: '解除廣告',
    editUserAbout: '解除簡介',
    manager: '解除禁任'
  };

  dbLog.insert({
    logType: logTypeMap[banType],
    userId: [currentUser._id, userId],
    data: { reason, violationCaseId },
    createdAt: new Date()
  });

  notifyUsersForFscLog(userId);

  if (shouldBan && banType === 'manager') {
    // 解職所有任職之經理與候選資格
    dbCompanies
      .find({ $or: [ { manager: userId }, { candidateList: userId } ] }, {
        fields: { manager: 1, candidateList: 1, voteList: 1 }
      })
      .forEach(({ _id: companyId, manager, candidateList, voteList }) => {
        const setFields = {};

        if (manager === userId) {
          setFields.manager = '!none';
        }

        const candidateIndex = candidateList.indexOf(userId);

        if (candidateIndex !== -1) {
          const newCandidateList = [...candidateList];
          newCandidateList.splice(candidateIndex, 1);

          const newVoteList = [...voteList];
          newVoteList.splice(candidateIndex, 1);

          Object.assign(setFields, {
            candidateList: newCandidateList,
            voteList: newVoteList
          });
        }

        dbCompanies.update(companyId, { $set: setFields });

        dbLog.insert({
          logType: '撤職紀錄',
          userId: [currentUser._id, userId],
          companyId,
          data: { reason: '禁任經理時系統自動撤職', violationCaseId },
          createdAt: new Date()
        });
      });

    // TODO: 使用 bulk
    dbFoundations.find({ manager: userId }, { fields: { _id: 1 } })
      .forEach(({ _id: companyId }) => {
        dbFoundations.update(companyId, { $set: { manager: '!none' } });

        dbLog.insert({
          logType: '撤職紀錄',
          userId: [currentUser._id, userId],
          companyId,
          data: { reason: '禁任經理時系統自動撤職', violationCaseId },
          createdAt: new Date()
        });
      });
  }
}
