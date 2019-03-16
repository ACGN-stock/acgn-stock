import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { _ } from 'meteor/underscore';

import { dbViolationCases, violatorTypeList, violatorTypeDisplayName } from '/db/dbViolationCases';
import { dbViolationCaseActionLogs, actionMap } from '/db/dbViolationCaseActionLogs';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { dbUserArchive } from '/db/dbUserArchive';
import { dbProducts } from '/db/dbProducts';
import { guardUser } from '/common/imports/guards';
import { populateViolators, notifyUnreadUsers } from './helpers';

Meteor.methods({
  addViolatorToViolationCase({ violationCaseId, violatorType, violatorId, reason }) {
    check(this.userId, String);
    check(violationCaseId, String);
    check(violatorType, Match.OneOf(...violatorTypeList));
    check(violatorId, String);
    check(reason, String);

    addViolatorToViolationCase(Meteor.user(), { violationCaseId, violatorType, violatorId, reason });

    return true;
  }
});

function addViolatorToViolationCase(currentUser, { violationCaseId, violatorType, violatorId, reason }) {
  guardUser(currentUser).checkHasRole('fscMember');

  const { state, violators: originalViolators, informer } = dbViolationCases.findByIdOrThrow(violationCaseId, {
    fields: { state: 1, violators: 1, informer: 1 }
  });
  const { allowedStates } = actionMap.addViolator;

  if (allowedStates && ! allowedStates.includes(state)) {
    throw new Meteor.Error(403, '案件狀態不符！');
  }

  if (_.findWhere(originalViolators, { violatorType, violatorId })) {
    throw new Meteor.Error(403, `${violatorTypeDisplayName(violatorType)} ${violatorId} 已經在名單中！`);
  }

  // 確保要新增的違規名單是既有的資料 ID
  if (violatorType === 'user') {
    dbUserArchive.findByIdOrThrow(violatorId, { fields: { _id: 1 } });
  }
  else if (violatorType === 'company') {
    dbCompanyArchive.findByIdOrThrow(violatorId, { fields: { _id: 1 } });
  }
  else if (violatorType === 'product') {
    dbProducts.findByIdOrThrow(violatorId, { fields: { _id: 1 } });
  }

  const newViolators = populateViolators({ violatorType, violatorId }).filter((violator) => {
    return ! _.findWhere(originalViolators, violator);
  });

  if (_.isEmpty(newViolators)) {
    throw new Meteor.Error(403, '沒有違規名單需要加入！');
  }

  // 標記新的被檢舉人與本案的舉報人未讀
  const newUnreadUsers = [
    ..._.chain(newViolators).where({ violatorType: 'user' }).pluck('violatorId').value(),
    informer
  ];

  const now = new Date();

  dbViolationCases.update({ _id: violationCaseId }, {
    $set: { updatedAt: now },
    $addToSet: { unreadUsers: { $each: newUnreadUsers } },
    $push: { violators: { $each: newViolators } }
  });
  notifyUnreadUsers(violationCaseId);

  dbViolationCaseActionLogs.insert({
    violationCaseId,
    action: 'addViolator',
    executor: currentUser._id,
    executedAt: now,
    data: { newViolators, reason }
  });
}
