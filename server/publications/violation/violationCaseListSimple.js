import { check, Match } from 'meteor/check';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Counts } from 'meteor/tmeasday:publish-counts';

import { hasRole } from '/db/users';
import { getCurrentRound } from '/db/dbRound';
import { dbViolationCases, categoryMap, stateMap } from '/db/dbViolationCases';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { publishWithTransformation } from '/server/imports/utils/publishWithTransformation';
import { appendScope } from '/server/imports/utils/publishWithScope';

const validListTypes = ['userViolated', 'companyViolated', 'userReported'];

const counterNameMap = {
  userViolated: 'userViolationCases',
  companyViolated: 'companyViolationCases',
  userReported: 'userReportedViolationCases'
};

Meteor.publish('violationCaseListSimple', function({ listType, userId, companyId, category, state, offset }) {
  check(listType, Match.OneOf(...validListTypes));

  if (listType === 'userViolated' || listType === 'userReported') {
    check(userId, String);
  }

  if (listType === 'companyViolated') {
    check(companyId, String);
  }

  check(category, Match.Optional(Match.OneOf(...Object.keys(categoryMap))));
  check(state, Match.Optional(Match.OneOf(...Object.keys(stateMap))));
  check(offset, Match.Integer);

  const isCurrentUserFscMember = this.userId && hasRole(Meteor.users.findOne(this.userId), 'fscMember');

  if (listType === 'userReported' && ! isCurrentUserFscMember) {
    return [];
  }

  const filter = {};

  switch (listType) {
    case 'userViolated':
      Object.assign(filter, { 'violators.violatorType': 'user', 'violators.violatorId': userId });
      break;
    case 'companyViolated':
      Object.assign(filter, {
        'violators.violatorType': 'company',
        'violators.violatorId': companyId,
        createdAt: { $gt: getCurrentRound().beginDate }
      });
      break;
    case 'userReported':
      Object.assign(filter, { informer: userId });
      break;
    default:
      return [];
  }

  if (category) {
    Object.assign(filter, { category });
  }

  if (state) {
    Object.assign(filter, { state });
  }

  const counterName = counterNameMap[listType];
  Counts.publish(this, counterName, dbViolationCases.find(filter, { fields: { _id: 1 } }), { noReady: true });

  const dataNumberPerPage = Meteor.settings.public.dataNumberPerPage[counterName];

  publishWithTransformation(this, {
    collection: 'violationCases',
    cursor: dbViolationCases.find(filter, {
      fields: {
        state: 1,
        category: 1,
        createdAt: 1,
        informer: 1
      },
      sort: { createdAt: -1 },
      skip: offset,
      limit: dataNumberPerPage
    }),
    transform: (fields) => {
      const result = { ..._.omit(fields, 'informer') };

      if (this.userId && fields.informer) {
        result.isReportedByCurrentUser = this.userId === fields.informer;
      }

      return appendScope(result, listType);
    }
  });

  this.ready();
});
// 一分鐘最多40次
limitSubscription('violationCaseListSimple', 40);
