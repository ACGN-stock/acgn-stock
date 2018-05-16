import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbVariables } from '/db/dbVariables';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

Meteor.methods({
  legacyEditAnnouncement(announcement, announcementDetail) {
    check(this.userId, String);
    check(announcement, String);
    check(announcementDetail, String);
    legacyEditAnnouncement(Meteor.user(), announcement, announcementDetail);

    return true;
  }
});
function legacyEditAnnouncement(user, announcement, announcementDetail) {
  debug.log('legacyEditAnnouncement', { user, announcement, announcementDetail });
  guardUser(user).checkHasAnyRoles('developer', 'planner', 'fscMember');
  dbVariables.set('announcement', announcement);
  dbVariables.set('announcementDetail', announcementDetail);
}
