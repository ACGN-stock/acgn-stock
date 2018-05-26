import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbLog } from '/db/dbLog';
import { roleDisplayName, isRoleManageable } from '/db/users';
import { debug } from '/server/imports/utils/debug';
import { limitMethod } from '/server/imports/utils/rateLimit';

Meteor.methods({
  unassignUserRole({ userId, role, reason }) {
    check(this.userId, String);
    check(role, String);
    check(reason, String);
    unassignUserRole(Meteor.user(), { userId, role, reason });

    return true;
  }
});

export function unassignUserRole(currentUser, { userId, role, reason }) {
  debug.log('unassignUserRole', { currentUser, userId, role, reason });

  if (! isRoleManageable(currentUser, role)) {
    throw new Meteor.Error(403, '權限不足，無法進行此操作！');
  }

  const { _id: currentUserId } = currentUser;

  const user = Meteor.users.findByIdOrThrow(userId, { fields: { 'profile.roles': 1 } });

  if (! user.profile.roles.includes(role)) {
    throw new Meteor.Error(404, `使用者 ${userId} 並不具有 ${roleDisplayName(role)} 的身份！`);
  }

  Meteor.users.update(userId, { $pull: { 'profile.roles': role } });
  dbLog.insert({
    logType: '身份解除',
    userId: [currentUserId, userId],
    data: { role, reason },
    createdAt: new Date()
  });
}

limitMethod('unassignUserRole');
