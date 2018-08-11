import { Meteor } from 'meteor/meteor';
import { Counts } from 'meteor/tmeasday:publish-counts';

import { dbAnnouncements } from '/db/dbAnnouncements';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('currentUserUnreadAnnouncementCount', function() {
  debug.log('publish currentUserUnreadAnnouncementCount');

  if (! this.userId) {
    return [];
  }

  Counts.publish(
    this,
    'currentUserUnreadAnnouncements',
    dbAnnouncements.find({ readers: { $ne: this.userId }, voided: false }, { fields: { _id: 1 } })
  );
});
// 一分鐘最多20次
limitSubscription('currentUserUnreadAnnouncementCount', 20);
