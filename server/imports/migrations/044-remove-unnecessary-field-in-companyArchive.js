import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbCompanyArchive } from '/db/dbCompanyArchive';

defineMigration({
  version: 44,
  name: 'remove unnecessary field in companyArchive',
  up() {
    dbCompanyArchive.update({}, { $unset: { invest: 1 } }, { multi: true });
  }
});
