import { dbRuleAgendas } from '/db/dbRuleAgendas';
import { defineMigration } from '/server/imports/utils/defineMigration';

defineMigration({
  version: 31,
  name: 'add activeUserCount to ruleAgendas',
  async up() {
    await dbRuleAgendas.rawCollection().update({
      activeUserCount: { $exists: false }
    }, {
      $set: { activeUserCount: 0 }
    }, { multi: true });
  }
});
