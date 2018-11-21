import { defineMigration } from '/server/imports/utils/defineMigration';
import { executeBulksSync } from '/server/imports/utils/executeBulksSync';
import { dbDirectors } from '/db/dbDirectors';

defineMigration({
  version: 36,
  name: 'fix forceCancelUserOrders',
  up() {
    const directorsBulk = dbDirectors.rawCollection().initializeUnorderedBulkOp();
    const directors = dbDirectors.find({}).fetch();
    const directorsMap = {};
    while (directors.length > 0) {
      const director = directors.pop();
      const mapKey = director.userId + director.companyId;
      if (directorsMap[mapKey]) {
        directorsBulk.find({ _id: director._id }).remove();
        directorsBulk
          .find({ _id: directorsMap[mapKey] })
          .updateOne({ $inc: { stocks: director.stocks } });
      }
      else {
        directorsMap[mapKey] = director._id;
      }
    }
    executeBulksSync(directorsBulk);
  }
});
