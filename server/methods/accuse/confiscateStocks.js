import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbDirectors } from '/db/dbDirectors';
import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  confiscateStocks({ userId, message }) {
    check(this.userId, String);
    check(userId, String);
    check(message, String);
    confiscateStocks(Meteor.user(), { userId, message });

    return true;
  }
});
function confiscateStocks(user, { userId, message }) {
  debug.log('confiscateStocks', { user, userId, message });
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '您並非金融管理會委員，無法進行此操作！');
  }
  if (Meteor.users.find(userId).count() < 1) {
    throw new Meteor.Error(404, '找不到識別碼為「' + userId + '」的使用者！');
  }
  const cursor = dbDirectors.find({ userId });
  if (cursor.count() < 1) {
    return true;
  }
  const directorsBulk = dbDirectors.rawCollection().initializeUnorderedBulkOp();
  const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
  const createdAt = new Date();
  cursor.forEach((directorData) => {
    const { companyId, stocks } = directorData;
    logBulk.insert({
      logType: '沒收股份',
      userId: [user._id, userId],
      companyId: companyId,
      data: {
        reason: message,
        stocks
      },
      createdAt: createdAt
    });
    if (dbDirectors.find({ companyId, userId: '!FSC' }).count() > 0) {
      // 由於directors主鍵為Mongo Object ID，在Bulk進行find會有問題，故以companyId+userId進行搜尋更新
      directorsBulk
        .find({ companyId, userId: '!FSC' })
        .updateOne({
          $inc: {
            stocks: stocks
          }
        });
    }
    else {
      directorsBulk.insert({
        companyId: companyId,
        userId: '!FSC',
        stocks: stocks,
        createdAt: createdAt
      });
    }
  });
  logBulk.execute();
  directorsBulk.execute();
  dbDirectors.remove({ userId });

  return true;
}
