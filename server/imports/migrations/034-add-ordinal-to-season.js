import { Meteor } from 'meteor/meteor';

import { dbSeason } from '/db/dbSeason';
import { defineMigration } from '/server/imports/utils/defineMigration';

defineMigration({
  version: 34,
  name: 'add ordinal to season',
  up() {
    if (dbSeason.find().count() === 0) {
      return;
    }

    const seasonBulk = dbSeason.rawCollection().initializeUnorderedBulkOp();

    dbSeason.find({}, { sort: { beginDate: 1 } }).forEach(({ _id: seasonId }, i) => {
      seasonBulk.find({ _id: seasonId }).updateOne({ $set: { ordinal: i + 1 } });
    });

    Meteor.wrapAsync(seasonBulk.execute, seasonBulk)();
  }
});
