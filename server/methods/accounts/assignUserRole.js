import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbLog } from '/db/dbLog';
import { userRoleMap, roleDisplayName, isRoleManageable } from '/db/users';
import { debug } from '/server/imports/utils/debug';
import { limitMethod } from '/server/imports/utils/rateLimit';

Meteor.methods({
  assignUserRole({ userId, role, reason }) {
    check(this.userId, String);
    check(role, new Match.OneOf(...Object.keys(userRoleMap)));
    check(reason, String);
    assignUserRole(Meteor.user(), { userId, role, reason });

    return true;
  }
});

export function assignUserRole(currentUser, { userId, role, reason }) {
  debug.log('assignUserRole', { currentUser, userId, role, reason });

  if (! isRoleManageable(currentUser, role)) {
    throw new Meteor.Error(403, '權限不足，無法進行此操作！');
  }

  const { _id: currentUserId } = currentUser;

  const user = Meteor.users.findByIdOrThrow(userId, { fields: { 'profile.roles': 1 } });

  if (user.profile.roles.includes(role)) {
    throw new Meteor.Error(404, `使用者 ${userId} 已經具有 ${roleDisplayName(role)} 的身份！`);
  }

  Meteor.users.update(userId, { $addToSet: { 'profile.roles': role } });
  dbLog.insert({
    logType: '身份指派',
    userId: [currentUserId, userId],
    data: { role, reason },
    createdAt: new Date()
  });
}

limitMethod('assignUserRole');
