import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbAnnouncements } from '/db/dbAnnouncements';

defineMigration({
  version: 41,
  name: 'add voided index to announcements',
  async up() {
    await dbAnnouncements.rawCollection().createIndex({ voided: 1 });
  }
});
