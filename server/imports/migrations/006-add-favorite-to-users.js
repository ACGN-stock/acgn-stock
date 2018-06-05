import { Meteor } from 'meteor/meteor';

import { defineMigration } from '/server/imports/utils/defineMigration';

defineMigration({
  version: 6,
  name: 'add favorite to users',
  up() {
    Meteor.users.update({}, { $set: { favorite: [] } }, { multi: true });
  }
});
