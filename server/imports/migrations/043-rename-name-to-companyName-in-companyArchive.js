import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { executeBulksSync } from '/server/imports/utils/executeBulksSync';

defineMigration({
  version: 43,
  name: 'rename name to companyName in companyArchive',
  async up() {
    await dbCompanyArchive.rawCollection().dropIndex({ name: 1 });
    const companyArchiveBulk = dbCompanyArchive.rawCollection().initializeUnorderedBulkOp();
    companyArchiveBulk.find({}).update({ $rename: { name: 'companyName' } });
    executeBulksSync(companyArchiveBulk);
    await dbCompanyArchive.rawCollection().createIndex({ companyName: 1 }, { unique: true });
  }
});
