import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { debug } from '/server/imports/utils/debug';
import { executeBulksSync } from '/server/imports/utils/executeBulksSync';
import { guardUser } from '/common/imports/guards';
import { dbDirectors } from '/db/dbDirectors';
import { dbViolationCases } from '/db/dbViolationCases';
import { dbOrders } from '/db/dbOrders';
import { dbLog } from '/db/dbLog';
import { notifyUsersForFscLog } from '/server/methods/accuse/helpers';

Meteor.methods({
  forceCancelUserOrders({ userId, reason, violationCaseId }) {
    check(this.userId, String);
    check(userId, String);
    check(reason, String);
    check(violationCaseId, Match.Optional(String));

    forceCancelUserOrders(Meteor.user(), { userId, reason, violationCaseId });

    return true;
  }
});
export function forceCancelUserOrders(currentUser, { userId, reason, violationCaseId }) {
  debug.log('forceCancelUserOrders', { user: currentUser, userId, reason, violationCaseId });

  checkError(currentUser, { userId, violationCaseId });

  const cursor = dbOrders.find({ userId });
  if (cursor.count() < 1) {
    return;
  }

  let increaseMoney = 0;
  const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
  const directorsBulk = dbDirectors.rawCollection().initializeUnorderedBulkOp();
  const createdAt = new Date();
  cursor.forEach((orderData) => {
    const { companyId, orderType, unitPrice, amount, done } = orderData;
    const leftAmount = amount - done;

    logBulk.insert({
      logType: '金管撤單',
      userId: [currentUser._id, userId],
      companyId,
      data: {
        reason,
        violationCaseId,
        price: unitPrice,
        orderType,
        amount: leftAmount
      },
      createdAt
    });

    if (orderType === '購入') {
      increaseMoney += unitPrice * leftAmount;
    }
    else if (orderType === '賣出') {
      directorsBulk
        .find({ userId, companyId })
        .upsert()
        .updateOne({
          $setOnInsert: { createdAt: createdAt },
          $inc: { stocks: leftAmount }
        });
    }
  });
  dbOrders.remove({ userId });
  Meteor.users.update(userId, { $inc: { 'profile.money': increaseMoney } });
  executeBulksSync(logBulk, directorsBulk);
  notifyUsersForFscLog(userId);
}

// TODO need better name?
function checkError(currentUser, { userId, violationCaseId }) {
  guardUser(currentUser).checkHasRole('fscMember');

  Meteor.users.findByIdOrThrow(userId, { fields: { _id: 1 } });

  if (violationCaseId) {
    dbViolationCases.findByIdOrThrow(violationCaseId, { fields: { _id: 1 } });
  }
}
