import { Meteor } from 'meteor/meteor';

import { dbProducts } from '/db/dbProducts';
import { dbCompanies } from '/db/dbCompanies';
import { dbFoundations } from '/db/dbFoundations';
import { dbLog } from '/db/dbLog';
import { dbNotifications, notificationCategories } from '/db/dbNotifications';
import { dbViolationCases } from '/db/dbViolationCases';
import { executeBulksSync } from '/server/imports/utils/executeBulksSync';

// 從公司 ID 推導被檢舉時應負責的使用者 ID
export function getResponsibleUserForCompany(companyId) {
  const { manager } =
    dbCompanies.findOne(companyId, { fields: { manager: 1 } }) ||
    dbFoundations.findByIdOrThrow(companyId, { fields: { manager: 1 } });

  // 有經理人的狀況下，回傳該經理人
  if (manager && manager !== '!none') {
    return manager;
  }

  // 沒有經理人的狀況下，從公司 log 找出最近一任經理或創始人
  const log = dbLog.findOne({
    logType: { $in: ['創立公司', '就任經理'] },
    companyId
  }, {
    fields: { userId: 1 },
    sort: { createdAt: -1 }
  });

  if (! log) {
    throw new Meteor.Error(404, '無法推論該為此負責的經理人！');
  }

  return log.userId[0];
}

/*
 * 從一個違規者推導出相關的全部違規者列表
 *
 * 使用者：只包含那一個使用者
 * 公司：包含公司與需對該公司負責的使用者 (see getResponsibleUserForCompany)
 * 產品：包含產品與其所屬公司，以及需對該公司負責的使用者
 */
export function populateViolators({ violatorType, violatorId }) {
  const result = [ { violatorType, violatorId } ];

  if (violatorType === 'company') {
    const userId = getResponsibleUserForCompany(violatorId);
    result.push(...populateViolators({ violatorType: 'user', violatorId: userId }));
  }
  else if (violatorType === 'product') {
    const { companyId } = dbProducts.findByIdOrThrow(violatorId, { fields: { companyId: 1 } });
    result.push(...populateViolators({ violatorType: 'company', violatorId: companyId }));
  }

  return result;
}

export function notifyUnreadUsers(violationCaseId) {
  const { unreadUsers } = dbViolationCases.findByIdOrThrow(violationCaseId, { fields: { unreadUsers: 1 } });
  const bulkOp = dbNotifications.rawCollection().initializeUnorderedBulkOp();

  unreadUsers.forEach((userId) => {
    bulkOp.find({
      category: notificationCategories.VIOLATION_CASE,
      targetUser: userId,
      'data.violationCaseId': violationCaseId
    }).upsert().updateOne({ $set: { notifiedAt: new Date() } });
  });

  executeBulksSync(bulkOp);
}
