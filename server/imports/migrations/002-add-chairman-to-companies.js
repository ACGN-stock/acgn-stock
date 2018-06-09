import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbCompanies } from '/db/dbCompanies';
import { dbDirectors } from '/db/dbDirectors';

defineMigration({
  version: 2,
  name: 'add chairman to companies',
  up() {
    dbCompanies.find({}, { fields: { _id: 1 } }).forEach(({ _id: companyId }) => {
      const chairmanData = dbDirectors.findOne({ companyId }, {
        sort: { stocks: -1, createdAt: 1 },
        fields: { userId: 1 }
      });
      if (chairmanData) {
        dbCompanies.update(companyId, { $set: { chairman: chairmanData._id } });
      }
    });
  }
});
