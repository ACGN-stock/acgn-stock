import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { check } from 'meteor/check';

import { dbAnnouncements } from '/db/dbAnnouncements';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { publishWithTransformation } from '/server/imports/utils/publishWithTransformation';

Meteor.publish('announcementRejectionDetail', function(announcementId) {
  debug.log('publish announcementRejectionDetail');
  check(announcementId, String);

  publishWithTransformation(this, {
    collection: 'announcements',
    cursor: dbAnnouncements.find(announcementId, {
      fields: {
        subject: 1,
        category: 1,
        voided: 1,
        rejectionPetition: 1,
        rejectionPoll: 1
      }
    }),
    transform: (fields) => {
      const result = { ...fields };

      if (fields.rejectionPoll) {
        const { voided } = fields;
        const { dueAt, yesVotes, noVotes } = fields.rejectionPoll;

        // 標記目前使用者的投票選項
        if (this.userId) {
          const hasVotedYes = yesVotes.includes(this.userId);
          const hasVotedNo = noVotes.includes(this.userId);

          Object.assign(result.rejectionPoll, {
            currentUserChoice: hasVotedYes ? 'yes' : hasVotedNo ? 'no' : undefined
          });
        }

        // 若非已作廢公告，在尚未截止時隱藏投票名單
        // NOTE: 由於此處判斷的方式，投票結束後，一般需要重新訂閱（i.e., 重新進入頁面），以正確拿到投票名單
        if (! voided && Date.now() < dueAt.getTime()) {
          result.rejectionPoll = _.omit(result.rejectionPoll, 'yesVotes', 'noVotes');
        }
      }

      return result;
    }
  });

  this.ready();
});
// 一分鐘最多20次
limitSubscription('announcementRejectionDetail', 20);
