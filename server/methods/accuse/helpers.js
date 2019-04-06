import { dbNotifications, notificationCategories } from '/db/dbNotifications';
import { executeBulksSync } from '/server/imports/utils/executeBulksSync';

export function notifyUsersForFscLog(...targetUsers) {
  const bulkOp = dbNotifications.rawCollection().initializeUnorderedBulkOp();

  targetUsers.forEach((userId) => {
    bulkOp.find({
      category: notificationCategories.FSC_LOG,
      targetUser: userId
    }).upsert().updateOne({ $set: { notifiedAt: new Date() } });
  });

  executeBulksSync(bulkOp);
}
