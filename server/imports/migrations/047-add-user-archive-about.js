import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbUserArchive } from '/db/dbUserArchive';

defineMigration({
  version: 47,
  name: 'add user archive about',
  up() {
    dbUserArchive.update(
      {},
      { $set: { about: { description: '' } } },
      { multi: true }
    );
  }
});
