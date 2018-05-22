import { Meteor } from 'meteor/meteor';
import { Counts } from 'meteor/tmeasday:publish-counts';

import { dbViolationCases } from '/db/dbViolationCases';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('currentUserUnreadViolationCaseCount', function() {
  debug.log('publish currentUserUnreadViolationCaseCount');

  if (! this.userId) {
    return [];
  }

  Counts.publish(this, 'currentUserUnreadViolationCases', dbViolationCases.find({ unreadUsers: this.userId }, { fields: { _id: 1 } }));
});
// 一分鐘最多20次
limitSubscription('currentUserUnreadViolationCaseCount', 20);
