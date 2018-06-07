import { Meteor } from 'meteor/meteor';

import { defineMigration } from '/server/imports/utils/defineMigration';

defineMigration({
  version: 30,
  name: 'rename lastReadAccuseLogDate to lastReadFscLogDate in user profile',
  async up() {
    await Meteor.users.rawCollection().update({}, {
      $rename: { 'profile.lastReadAccuseLogDate': 'profile.lastReadFscLogDate' }
    }, { multi: true });
  }
});
