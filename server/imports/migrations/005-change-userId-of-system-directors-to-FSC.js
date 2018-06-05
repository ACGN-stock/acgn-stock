import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbDirectors } from '/db/dbDirectors';

defineMigration({
  version: 5,
  name: 'change userId of !system directors to !FSC',
  up() {
    dbDirectors.update({ userId: '!system' }, { $set: { userId: '!FSC' } }, { multi: true });
  }
});
