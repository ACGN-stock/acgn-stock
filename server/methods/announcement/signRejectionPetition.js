import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbAnnouncements } from '/db/dbAnnouncements';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { computeActiveUserCount } from '/server/imports/utils/computeActiveUserCount';
import { guardUser } from '/common/imports/guards';

Meteor.methods({
  signRejectionPetition({ announcementId }) {
    check(this.userId, String);
    check(announcementId, String);
    signRejectionPetition(Meteor.user(), { announcementId });

    return true;
  }
});

export function signRejectionPetition(currentUser, args, resourceLocked = false) {
  debug.log('signRejectionPetition', { currentUser, args, resourceLocked });

  const nowDate = new Date();
  const { _id: currentUserId } = currentUser;
  const { announcementId } = args;

  guardUser(currentUser).checkCanVote();

  const { rejectionPetition: petition, category, voided } = dbAnnouncements.findByIdOrThrow(announcementId, {
    fields: { rejectionPetition: 1, category: 1, voided: 1 }
  });

  if (! petition) {
    throw new Meteor.Error(403, '此公告並無進行否決連署！');
  }

  if (voided) {
    throw new Meteor.Error(403, '此公告已作廢！');
  }

  const { dueAt, signers, thresholdPercent, activeUserCount } = petition;
  const threshold = Math.ceil(activeUserCount * thresholdPercent / 100);

  if (nowDate.getTime() > dueAt.getTime()) {
    throw new Meteor.Error(403, '連署時間已過！');
  }

  if (signers.includes(currentUserId)) {
    throw new Meteor.Error(403, '您已經連署過了！');
  }

  if (signers.length > 0 && signers.length >= threshold) {
    throw new Meteor.Error(403, '連署人數已達門檻！');
  }

  if (! resourceLocked) {
    resourceManager.throwErrorIsResourceIsLock(['signRejectionPetition', `announcement_${announcementId}`]);

    // 先鎖定資源，再重新跑一次 function 進行運算
    resourceManager.request('signRejectionPetition', [`announcement_${announcementId}`], (release) => {
      signRejectionPetition(Meteor.users.findByIdOrThrow(currentUserId), args, true);
      release();
    });

    return;
  }

  dbAnnouncements.update(announcementId, { $addToSet: { 'rejectionPetition.signers': currentUserId } });
  signers.push(currentUserId);

  // 若連署達到門檻，啟動否決投票
  if (signers.length >= threshold) {
    dbAnnouncements.update(announcementId, { $set: { 'rejectionPetition.passedAt': nowDate } });

    const { durationDays, thresholdPercent } = Meteor.settings.public.announcement[category].rejectionPoll;
    const oneDayTime = 24 * 60 * 60 * 1000;

    const activeUserCount = computeActiveUserCount();
    const dueAt = new Date(nowDate.getTime() + durationDays * oneDayTime);

    dbAnnouncements.update(announcementId, { $set: { rejectionPoll: { activeUserCount, thresholdPercent, dueAt } } });
  }
}
// 一分鐘鐘最多兩次
limitMethod('signRejectionPetition', 2, 60000);
