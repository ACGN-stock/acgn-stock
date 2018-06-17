import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbAnnouncements } from '/db/dbAnnouncements';

defineMigration({
  version: 25,
  name: 'new announcement system',
  async up() {
    await Promise.all([
      dbAnnouncements.rawCollection().createIndex({ categoty: 1 }),
      dbAnnouncements.rawCollection().createIndex({ createdAt: -1 }),
      dbAnnouncements.rawCollection().createIndex({ readers: 1 })
    ]);
  }
});
