import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbAnnouncements } from '/db/dbAnnouncements';

defineMigration({
  version: 26,
  name: 'fix announcements index typo',
  async up() {
    await Promise.all([
      dbAnnouncements.rawCollection().dropIndex({ categoty: 1 }),
      dbAnnouncements.rawCollection().createIndex({ category: 1 })
    ]);
  }
});
