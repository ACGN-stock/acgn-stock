import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

Meteor.methods({
  fscAnnouncement({ userIds, companyId, message }) {
    check(this.userId, String);
    check(userIds, [String]);
    check(companyId, new Match.Maybe(String));
    check(message, String);
    fscAnnouncement(Meteor.user(), { userIds, companyId, message });

    return true;
  }
});
function fscAnnouncement(user, { userIds, companyId, message }) {
  debug.log('fscAnnouncement', { user, userIds, message });

  guardUser(user).checkHasRole('fscMember');

  const nonEmptyUserIds = userIds.filter((id) => {
    return id && id !== '!none';
  });

  dbLog.insert({
    logType: '金管通告',
    userId: [user._id, ...nonEmptyUserIds],
    companyId,
    data: { message },
    createdAt: new Date()
  });
}
