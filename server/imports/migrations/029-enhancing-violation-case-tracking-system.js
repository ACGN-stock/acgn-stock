import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbViolationCases } from '/db/dbViolationCases';
import { dbViolationCaseActionLogs } from '/db/dbViolationCaseActionLogs';

defineMigration({
  version: 29,
  name: 'enhancing violation case tracking system',
  async up() {
    await Promise.all([
      // 移除各式未使用到的 timestamps
      dbViolationCases.rawCollection().update({}, {
        $unset: { acceptedAt: 0, closedAt: 0, rejectedAt: 0 }
      }, { multi: true }),

      // 將狀態 accepted 改為 processing
      dbViolationCases.rawCollection().update({ state: 'accepted' }, {
        $set: { state: 'processing' }
      }, { multi: true }),
      dbViolationCaseActionLogs.rawCollection().update({
        action: 'setState',
        'data.state': 'accepted'
      }, {
        $set: { 'data.state': 'processing' }
      }, { multi: true })
    ]);
  }
});
