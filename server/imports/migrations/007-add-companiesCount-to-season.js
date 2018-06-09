import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbSeason } from '/db/dbSeason';

defineMigration({
  version: 7,
  name: 'season add companies count field.',
  up() {
    dbSeason.update({}, { $set: { companiesCount: 0 } }, { multi: true });
  }
});
