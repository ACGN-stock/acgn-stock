import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbVariables } from '/db/dbVariables';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

Meteor.methods({
  editAnnouncement(announcement, announcementDetail) {
    check(this.userId, String);
    check(announcement, String);
    check(announcementDetail, String);
    editAnnouncement(Meteor.user(), announcement, announcementDetail);

    return true;
  }
});
function editAnnouncement(user, announcement, announcementDetail) {
  debug.log('editAnnouncement', { user, announcement, announcementDetail });
  guardUser(user).checkHasAnyRoles('developer', 'planner', 'fscMember');
  dbVariables.set('announcement', announcement);
  dbVariables.set('announcementDetail', announcementDetail);
}
