import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbLog } from '/db/dbLog';
import { dbViolationCases } from '/db/dbViolationCases';
import { dbViolationCaseActionLogs } from '/db/dbViolationCaseActionLogs';

defineMigration({
  version: 27,
  name: 'violation case tracking system',
  async up() {
    await Promise.all([
      dbViolationCases.rawCollection().createIndex({ category: 1 }),
      dbViolationCases.rawCollection().createIndex({ state: 1 }),
      dbViolationCases.rawCollection().createIndex({ createdAt: -1 }),
      dbViolationCases.rawCollection().createIndex({ unreadUsers: 1 }),
      dbViolationCases.rawCollection().createIndex({
        'violators.violatorType': 1, 'violators.violatorId': 1
      }),
      dbViolationCases.rawCollection().createIndex({
        _id: 1, 'violators.violatorType': 1, 'violators.violatorId': 1
      }, { unique: true }),
      dbViolationCaseActionLogs.rawCollection().createIndex({ violationCaseId: 1 }),
      dbViolationCaseActionLogs.rawCollection().createIndex({ executedAt: 1 }),
      dbLog.rawCollection().createIndex({ 'data.violationCaseId': 1 }),
      dbLog.rawCollection().update({
        logType: { $in: ['撤職紀錄', '撤銷廣告'] },
        'data.reason': { $exists: false }
      }, {
        $set: { 'data.reason': '（未指定理由）' }
      }, { multi: true })
    ]);
  }
});
