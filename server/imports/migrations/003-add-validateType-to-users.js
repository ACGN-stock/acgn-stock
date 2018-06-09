import { Meteor } from 'meteor/meteor';

import { defineMigration } from '/server/imports/utils/defineMigration';

defineMigration({
  version: 3,
  name: 'add validateType to users',
  up() {
    Meteor.users.update({ 'services.google': { $exists: true } }, {
      $set: { 'profile.validateType': 'Google' }
    }, { multi: true });
    Meteor.users.update({ 'username': { $exists: true } }, {
      $set: { 'profile.validateType': 'PTT' }
    }, { multi: true });
  }
});
