import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbDirectors } from '/db/dbDirectors';
import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

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

  guardUser(user).checkHasRole('fscMember');

  Meteor.users.findByIdOrThrow(userId, { fields: { _id: 1 } });

  const cursor = dbDirectors.find({ userId });
  if (cursor.count() < 1) {
    return;
  }

  const directorsBulk = dbDirectors.rawCollection().initializeUnorderedBulkOp();
  const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
  const createdAt = new Date();
  cursor.forEach((directorData) => {
    const { companyId, stocks } = directorData;
    logBulk.insert({
      logType: '沒收股份',
      userId: [user._id, userId],
      companyId,
      data: {
        reason: message,
        stocks
      },
      createdAt
    });
    if (dbDirectors.find({ companyId, userId: '!FSC' }).count() > 0) {
      // 由於directors主鍵為Mongo Object ID，在Bulk進行find會有問題，故以companyId+userId進行搜尋更新
      directorsBulk
        .find({ companyId, userId: '!FSC' })
        .updateOne({ $inc: { stocks } });
    }
    else {
      directorsBulk.insert({
        companyId,
        userId: '!FSC',
        stocks,
        createdAt
      });
    }
  });
  logBulk.execute();
  directorsBulk.execute();
  dbDirectors.remove({ userId });
}
