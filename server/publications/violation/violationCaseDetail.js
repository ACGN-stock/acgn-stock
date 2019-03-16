import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { hasRole } from '/db/users';
import { dbViolationCases } from '/db/dbViolationCases';
import { dbViolationCaseActionLogs } from '/db/dbViolationCaseActionLogs';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { dbNotifications, notificationCategories } from '/db/dbNotifications';

const RESTRICTED_FIELDS = ['informer', 'unreadUsers'];

Meteor.publish('violationCaseDetail', function(violationCaseId) {
  debug.log('publish violationCaseDetail');
  check(violationCaseId, String);

  // 消除未讀
  if (this.userId) {
    dbNotifications.remove({
      category: notificationCategories.VIOLATION_CASE,
      targetUser: this.userId,
      'data.violationCaseId': violationCaseId
    });
    dbViolationCases.update(violationCaseId, { $pull: { unreadUsers: this.userId } });
  }

  const excludedFields = { };

  if (! this.userId || ! hasRole(Meteor.users.findOne(this.userId), 'fscMember')) {
    Object.assign(excludedFields, RESTRICTED_FIELDS.reduce((obj, field) => {
      obj[field] = 0;

      return obj;
    }, {}));
  }

  return [
    dbViolationCases.find(violationCaseId, { fields: excludedFields }),
    dbViolationCaseActionLogs.find({ violationCaseId }, { sort: { executedAt: 1 } })
  ];
});
// 一分鐘最多20次
limitSubscription('violationCaseDetail', 20);
