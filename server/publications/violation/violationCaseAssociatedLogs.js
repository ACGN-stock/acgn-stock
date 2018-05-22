import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Counts } from 'meteor/tmeasday:publish-counts';

import { dbLog } from '/db/dbLog';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('violationCaseAssociatedLogs', function({ violationCaseId, offset }) {
  debug.log('publish violationCaseDetail');
  check(violationCaseId, String);
  check(offset, Match.Integer);

  const filter = { 'data.violationCaseId': violationCaseId };

  Counts.publish(this, 'violationCaseAssociatedLogs', dbLog.find(filter, { fields: { _id: 1 } }), { noReady: true });

  const { violationCaseAssociatedLogs: dataNumberPerPage } = Meteor.settings.public.dataNumberPerPage;

  return dbLog.find(filter, {
    sort: { createdAt: -1 },
    skip: offset,
    limit: dataNumberPerPage
  });
});
// 一分鐘最多20次
limitSubscription('violationCaseAssociatedLogs', 20);
