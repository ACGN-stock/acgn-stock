import { check, Match } from 'meteor/check';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Counts } from 'meteor/tmeasday:publish-counts';

import { dbViolationCases, categoryMap, stateMap } from '/db/dbViolationCases';
import { hasRole } from '/db/users';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { publishWithTransformation } from '/server/imports/utils/publishWithTransformation';

const DESCRIPTION_DIGEST_LENGTH_LIMIT = 100;

Meteor.publish('violationCaseList', function({ category, state, violatorUserId, onlyUnread, offset }) {
  debug.log('publish violationCaseList', { category, state, onlyUnread, offset });

  check(category, Match.Optional(Match.OneOf(...Object.keys(categoryMap))));
  check(state, Match.Optional(Match.OneOf(...Object.keys(stateMap))));
  check(violatorUserId, Match.Optional(String));
  check(onlyUnread, Match.Optional(Boolean));
  check(offset, Match.Integer);

  const filter = {};

  if (category) {
    Object.assign(filter, { category });
  }

  if (state) {
    Object.assign(filter, { state });
  }

  if (violatorUserId) {
    Object.assign(filter, { 'violators.violatorType': 'user', 'violators.violatorId': violatorUserId });
  }

  if (this.userId && onlyUnread) {
    Object.assign(filter, { unreadUsers: this.userId });
  }

  const includedFields = {
    state: 1,
    category: 1,
    description: 1,
    createdAt: 1,
    updatedAt: 1,
    violators: 1,
    unreadUsers: 1,
    informer: 1
  };

  Counts.publish(this, 'violationCases', dbViolationCases.find(filter, { fields: { _id: 1 } }), { noReady: true });

  const { violationCases: dataNumberPerPage } = Meteor.settings.public.dataNumberPerPage;

  publishWithTransformation(this, {
    collection: 'violationCases',
    cursor: dbViolationCases.find(filter, {
      fields: includedFields,
      sort: { createdAt: -1 },
      skip: offset,
      limit: dataNumberPerPage
    }),
    transform: (fields) => {
      const result = { ..._.omit(fields, 'description', 'unreadUsers', 'informer') };

      if (this.userId && fields.unreadUsers) {
        result.isUnread = fields.unreadUsers.includes(this.userId);
      }

      if (this.userId && fields.informer) {
        result.isReportedByCurrentUser = this.userId === fields.informer;

        if (hasRole(Meteor.users.findOne(this.userId), 'fscMember')) {
          result.informer = fields.informer;
        }
      }

      if (fields.description) {
        result.descriptionDigest = fields.description.slice(0, DESCRIPTION_DIGEST_LENGTH_LIMIT);
        result.descriptionOmittedLength = fields.description.length - result.descriptionDigest.length;
      }

      return result;
    }
  });

  this.ready();
});
// 一分鐘最多20次
limitSubscription('violationCaseList');
