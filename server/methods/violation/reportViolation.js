import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { _ } from 'meteor/underscore';

import { dbViolationCases, violatorTypeList, categoryMap } from '/db/dbViolationCases';
import { guardUser } from '/common/imports/guards';
import { populateViolators, notifyUnreadUsers } from './helpers';

Meteor.methods({
  reportViolation({ category, description, violator }) {
    check(this.userId, String);
    check(category, Match.OneOf(...Object.keys(categoryMap)));
    check(description, String);
    check(violator, {
      violatorType: Match.OneOf(...violatorTypeList),
      violatorId: String
    });

    reportViolation(Meteor.user(), { category, description, violator });

    return true;
  }
});

function reportViolation(currentUser, { category, description, violator }) {
  guardUser(currentUser).checkNotBanned('accuse');

  const { allowedInitialViolatorTypes } = categoryMap[category];
  const { violatorType } = violator;

  if (allowedInitialViolatorTypes && ! allowedInitialViolatorTypes.includes(violatorType)) {
    throw new Meteor.Error(403, '不合法的違規類型！');
  }

  const violators = populateViolators(violator);

  // 標記被檢舉人未讀
  const unreadUsers = _.chain(violators).where({ violatorType: 'user' }).pluck('violatorId').value();

  const now = new Date();

  const violationCaseId = dbViolationCases.insert({
    informer: currentUser._id,
    state: 'pending',
    category,
    description,
    violators,
    unreadUsers,
    createdAt: now,
    updatedAt: now
  });
  notifyUnreadUsers(violationCaseId);
}
