import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbCompanyArchive } from '/db/dbCompanyArchive';

// 無效的Migration，由45修復
defineMigration({
  version: 43,
  name: 'rename name to companyName in companyArchive',
  async up() {
    await dbCompanyArchive.rawCollection().dropIndex({ name: 1 });
    await dbCompanyArchive.rawCollection().update({}, {
      $rename: { name: 'companyName' }
    }, { multi: true });
    await dbCompanyArchive.rawCollection().createIndex({ companyName: 1 }, { unique: true });
  }
});
