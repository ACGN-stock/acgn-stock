import { dbAnnouncements } from '/db/dbAnnouncements';
import { defineMigration } from '/server/imports/utils/defineMigration';

defineMigration({
  version: 33,
  name: 'announcement voiding',
  up() {
    dbAnnouncements.update({}, { $set: { voided: false } }, { multi: true });
  }
});
