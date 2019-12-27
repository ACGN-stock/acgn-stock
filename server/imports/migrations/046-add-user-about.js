import { Meteor } from 'meteor/meteor';

import { defineMigration } from '/server/imports/utils/defineMigration';

defineMigration({
  version: 46,
  name: 'add user about',
  up() {
    Meteor.users.update(
      {},
      { $set: { about: { description: '' } } },
      { multi: true }
    );
  }
});
