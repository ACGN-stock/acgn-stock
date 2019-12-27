import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { checkImageUrl } from '/server/imports/utils/checkImageUrl';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  editUserAbout(newUserAbout) {
    check(this.userId, String);
    check(newUserAbout, {
      description: String,
      picture: new Match.OneOf(String, null)
    });
    editUserAbout(this.userId, newUserAbout);

    return true;
  }
});
export function editUserAbout(userId, newUserAbout) {
  debug.log('editUserAbout', { userId, newUserAbout });

  const user = Meteor.users.findByIdOrThrow(userId, { fields: {
    'profile.ban': 1,
    'about.description': 1,
    'about.picture': 1
  } });

  if (_.contains(user.profile.ban, 'editUserAbout')) {
    throw new Meteor.Error(403, '您現在被金融管理會禁止了編輯個人簡介！');
  }

  if (newUserAbout.picture && user.picture !== newUserAbout.picture) {
    checkImageUrl(newUserAbout.picture);
  }

  Meteor.users.update(userId, { $set: { about: newUserAbout } });
}
limitMethod('editUserAbout');
