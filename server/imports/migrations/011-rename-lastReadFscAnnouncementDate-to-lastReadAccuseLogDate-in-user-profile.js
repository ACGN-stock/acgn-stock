import { Meteor } from 'meteor/meteor';

import { defineMigration } from '/server/imports/utils/defineMigration';

defineMigration({
  version: 11,
  name: 'rename lastReadFscAnnouncementDate to lastReadAccuseLogDate in user profile',
  async up() {
    await Meteor.users.rawCollection().update({
      'profile.lastReadFscAnnouncementDate': { $exists: true }
    }, {
      $rename: { 'profile.lastReadFscAnnouncementDate': 'profile.lastReadAccuseLogDate' }
    }, { multi: true });
  }
});
