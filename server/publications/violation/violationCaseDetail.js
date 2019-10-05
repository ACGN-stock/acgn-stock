import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { hasRole } from '/db/users';
import { dbViolationCases } from '/db/dbViolationCases';
import { dbViolationCaseActionLogs, actionMap } from '/db/dbViolationCaseActionLogs';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { dbNotifications, notificationCategories } from '/db/dbNotifications';
import { publishWithTransformation } from '/server/imports/utils/publishWithTransformation';

const RESTRICTED_FIELDS = ['unreadUsers'];

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

  const isFscMember = this.userId && hasRole(Meteor.users.findOne(this.userId), 'fscMember');
  const excludedFields = { };

  if (! isFscMember) {
    Object.assign(excludedFields, RESTRICTED_FIELDS.reduce((obj, field) => {
      obj[field] = 0;

      return obj;
    }, {}));
  }

  publishWithTransformation(this, {
    collection: 'violationCases',
    cursor: dbViolationCases.find(violationCaseId, { fields: excludedFields }),
    transform: (fields) => {
      const result = { ...fields };
      if (! isFscMember && result.informer !== this.userId) {
        delete result.informer;
      }

      return result;
    }
  });

  publishWithTransformation(this, {
    collection: 'violationCaseActionLogs',
    cursor: dbViolationCaseActionLogs.find({ violationCaseId }, { sort: { executedAt: 1 } }),
    transform: (fields) => {
      const result = { ...fields };
      if (actionMap[result.action].allowedIdentity === 'informer' && ! isFscMember && result.executor !== this.userId) {
        delete result.executor;
      }

      return result;
    }
  });

  this.ready();
});
// 一分鐘最多20次
limitSubscription('violationCaseDetail', 20);
