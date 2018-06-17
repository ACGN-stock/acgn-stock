import { Meteor } from 'meteor/meteor';

import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbTaxes } from '/db/dbTaxes';

defineMigration({
  version: 4,
  name: 'tax system',
  async up() {
    await dbTaxes.rawCollection().createIndex({ userId: 1 });

    Meteor.users.update({}, {
      $set: {
        'profile.lastSeasonTotalWealth': 0,
        'profile.noLoginDayCount': 0
      }
    }, { multi: true });
  }
});
