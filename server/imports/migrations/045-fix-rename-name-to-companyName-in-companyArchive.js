import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbCompanyArchive } from '/db/dbCompanyArchive';

defineMigration({
  version: 45,
  name: 'fix rename name to companyName in companyArchive',
  async up() {
    await dbCompanyArchive.rawCollection().dropIndex({ companyName: 1 });
    await dbCompanyArchive.update({}, {
      $rename: { name: 'companyName' }
    }, { multi: true });
    await dbCompanyArchive.rawCollection().createIndex({ companyName: 1 }, { unique: true });
  }
});
