import { Meteor } from 'meteor/meteor';

import { defineMigration } from '/server/imports/utils/defineMigration';

defineMigration({
  version: 11,
  name: 'rename lastReadFscAnnouncementDate to lastReadAccuseLogDate in user profile',
  async up() {
    await Meteor.users.rawCollection().update({
      lastReadFscAnnouncementDate: { $exists: true }
    }, {
      $rename: { lastReadFscAnnouncementDate: 'lastReadAccuseLogDate' }
    });
  }
});
