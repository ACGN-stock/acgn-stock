import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { check } from 'meteor/check';

import { dbAnnouncements } from '/db/dbAnnouncements';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('announcementDetail', function(announcementId) {
  debug.log('publish announcementDetail');
  check(announcementId, String);

  // 已讀標記
  if (this.userId) {
    dbAnnouncements.update(announcementId, { $addToSet: { readers: this.userId } });
  }

  const transformFields = (fields) => {
    const result = { ..._.omit(fields, 'rejectionPetition', 'rejectionPoll') };

    if (fields.rejectionPetition) {
      result.hasRejectionPetition = !! fields.rejectionPetition;
    }

    if (fields.rejectionPoll) {
      result.hasRejectionPoll = !! fields.rejectionPoll;
    }

    return result;
  };

  dbAnnouncements
    .find(announcementId, { fields: { readers: 0 } })
    .observeChanges({
      added: (id, fields) => {
        this.added('announcements', id, transformFields(fields));
      },
      changed: (id, fields) => {
        this.changed('announcements', id, transformFields(fields));
      },
      removed: (id) => {
        this.removed('announcements', id);
      }
    });
});
// 一分鐘最多20次
limitSubscription('announcementDetail', 20);
