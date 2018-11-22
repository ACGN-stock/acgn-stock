import { MongoInternals } from 'meteor/mongo';

import { defineMigration } from '/server/imports/utils/defineMigration';
import { executeBulksSync } from '/server/imports/utils/executeBulksSync';
import { dbDirectors } from '/db/dbDirectors';

defineMigration({
  version: 36,
  name: 'fix dbDirectors have two same user director data in one company',
  up() {
    const ObjectID = MongoInternals.NpmModule.ObjectID;
    const directorsBulk = dbDirectors.rawCollection().initializeOrderedBulkOp();
    const directorsMap = {};
    dbDirectors.find({}).forEach((director) => {
      const mapKey = director.userId + director.companyId;
      if (directorsMap[mapKey]) {
        directorsBulk.find({ _id: new ObjectID(director._id._str) }).remove();
        directorsBulk
          .find({ _id: new ObjectID(directorsMap[mapKey]._str) })
          .updateOne({ $inc: { stocks: director.stocks } });
      }
      else {
        directorsMap[mapKey] = director._id;
      }
    });
    executeBulksSync(directorsBulk);
  }
});
