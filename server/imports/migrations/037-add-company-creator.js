import { defineMigration } from '/server/imports/utils/defineMigration';
import { executeBulksSync } from '/server/imports/utils/executeBulksSync';
import { dbCompanies } from '/db/dbCompanies';
import { dbLog } from '/db/dbLog';
import { dbFoundations } from '/db/dbFoundations';

defineMigration({
  version: 37,
  name: 'add company creator',
  up() {
    const companyBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
    const foundationBulk = dbFoundations.rawCollection().initializeUnorderedBulkOp();

    dbLog.find({ logType: '創立公司' }).forEach(({ companyId, userId }) => {
      const creator = userId[0];

      companyBulk.find({ _id: companyId }).updateOne({ $set: { creator } });
      foundationBulk.find({ _id: companyId }).updateOne({ $set: { creator } });
    });

    executeBulksSync(companyBulk, foundationBulk);
  }
});
