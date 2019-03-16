import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { dbAnnouncements } from '/db/dbAnnouncements';
import { dbNotifications, notificationCategories } from '/db/dbNotifications';
import { dbLog, importantFscLogTypeList } from '/db/dbLog';
import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbViolationCases } from '/db/dbViolationCases';
import { executeBulksSync } from '/server/imports/utils/executeBulksSync';

async function appendFscLogNotifications(notificationsBulkOp) {
  // 加入未讀金管會紀錄之通知
  Meteor.users.find({ 'profile.lastReadFscLogDate': { $exists: true } }, { fields: { 'profile.lastReadFscLogDate': 1 } })
    .forEach(({ _id: userId, profile }) => {
      const unreadLogEntry = dbLog.findOne({
        logType: { $in: importantFscLogTypeList },
        userId: userId,
        'userId.0': { $ne: userId },
        createdAt: { $gt: profile.lastReadFscLogDate }
      }, {
        sort: { createdAt: -1 },
        fields: { _id: 0, createdAt: 1 }
      });

      if (unreadLogEntry) {
        notificationsBulkOp.insert({
          category: notificationCategories.FSC_LOG,
          targetUser: userId,
          notifiedAt: unreadLogEntry.createdAt
        });
      }
    });

  // 移除玩家的最後讀取金管會紀錄之時間
  await Meteor.users.rawCollection().updateMany({}, { $unset: { 'profile.lastReadFscLogDate': 0 } });
}

async function appendAnnouncementNotifications(notificationsBulkOp) {
  const userIds = _.pluck(Meteor.users.find({}, { fields: { _id: 1 } }).fetch(), '_id');

  // 加入舊有未作廢之公告的未讀通知
  dbAnnouncements.find({ readers: { $exists: true }, voided: false })
    .forEach(({ _id: announcementId, readers, createdAt }) => {
      const readerSet = new Set(readers);

      userIds.forEach((userId) => {
        if (readerSet.has(userId)) {
          return;
        }
        notificationsBulkOp.insert({
          category: notificationCategories.ANNOUNCEMENT,
          targetUser: userId,
          notifiedAt: createdAt,
          data: { announcementId }
        });
      });
    });
}

async function appendViolationCaseNotifications(notificationsBulkOp) {
  // 加入舊有違規案件的未讀通知，以最後更新時間為基準
  dbViolationCases.find({ unreadUsers: { $exists: true } })
    .forEach(({ _id: violationCaseId, unreadUsers, updatedAt }) => {
      unreadUsers.forEach((userId) => {
        notificationsBulkOp.insert({
          category: notificationCategories.ANNOUNCEMENT,
          targetUser: userId,
          notifiedAt: updatedAt,
          data: { violationCaseId }
        });
      });
    });
}

defineMigration({
  version: 42,
  name: 'notification system',
  async up() {
    const rawDbNotifications = dbNotifications.rawCollection();

    await Promise.all([
      rawDbNotifications.createIndex({ category: 1 }),
      rawDbNotifications.createIndex({ targetUser: 1 }),
      rawDbNotifications.createIndex({ notifiedAt: -1 }),
      rawDbNotifications.createIndex(
        { 'data.announcementId': 1 },
        { partialFilterExpression: { category: 'announcement' } }
      ),
      rawDbNotifications.createIndex(
        { 'data.violationCaseId': 1 },
        { partialFilterExpression: { category: 'violationCase' } }
      )
    ]);

    const notificationsBulkOp = rawDbNotifications.initializeUnorderedBulkOp();
    await appendFscLogNotifications(notificationsBulkOp);
    await appendAnnouncementNotifications(notificationsBulkOp);
    await appendViolationCaseNotifications(notificationsBulkOp);
    executeBulksSync(notificationsBulkOp);
  }
});
