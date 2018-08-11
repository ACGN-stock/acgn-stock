import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbAnnouncements } from '/db/dbAnnouncements';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

const validPollChoices = ['yes', 'no'];

Meteor.methods({
  voteRejectionPoll({ announcementId, choice }) {
    check(this.userId, String);
    check(announcementId, String);
    check(choice, Match.OneOf(...validPollChoices));
    voteRejectionPoll(Meteor.user(), { announcementId, choice });

    return true;
  }
});

export function voteRejectionPoll(currentUser, args, resourceLocked = false) {
  debug.log('voteRejectionPoll', { currentUser, args, resourceLocked });

  const nowDate = new Date();
  const { _id: currentUserId } = currentUser;
  const { announcementId, choice } = args;

  guardUser(currentUser).checkCanVote();

  const { rejectionPoll: poll, voided } = dbAnnouncements.findByIdOrThrow(announcementId, {
    fields: { rejectionPoll: 1, voided: 1 }
  });

  if (! poll) {
    throw new Meteor.Error(403, '此公告並無進行否決投票！');
  }

  if (voided) {
    throw new Meteor.Error(403, '此公告已作廢！');
  }

  const { dueAt, yesVotes, noVotes } = poll;

  if (nowDate.getTime() > dueAt.getTime()) {
    throw new Meteor.Error(403, '投票時間已過！');
  }

  if (yesVotes.includes(currentUserId) || noVotes.includes(currentUserId)) {
    throw new Meteor.Error(403, '您已經投票過了！');
  }

  if (! validPollChoices.includes(choice)) {
    throw new Meteor.Error(403, '不合法的投票選項！');
  }

  if (! resourceLocked) {
    resourceManager.throwErrorIsResourceIsLock(['voteRejectionPoll', `announcement_${announcementId}`]);

    // 先鎖定資源，再重新跑一次 function 進行運算
    resourceManager.request('voteRejectionPoll', [`announcement_${announcementId}`], (release) => {
      voteRejectionPoll(Meteor.users.findByIdOrThrow(currentUserId), args, true);
      release();
    });

    return;
  }

  dbAnnouncements.update(announcementId, { $addToSet: { [`rejectionPoll.${choice}Votes`]: currentUserId } });
}
// 一分鐘鐘最多兩次
limitMethod('voteRejectionPoll', 2, 60000);
