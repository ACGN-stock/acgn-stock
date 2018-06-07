import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Counts } from 'meteor/tmeasday:publish-counts';

import { limitSubscription } from '/server/imports/utils/rateLimit';
import { dbLog, fscLogTypeList } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('fscLogs', function({ offset }) {
  debug.log('publish fscLogs', { offset });
  check(offset, Match.Integer);

  const filter = {
    logType: { $in: fscLogTypeList }
  };

  Counts.publish(this, 'fscLogs', dbLog.find(filter, { fields: { _id: 1 } }), { noReady: true });

  return dbLog.find(filter, {
    sort: { createdAt: -1 },
    skip: offset,
    limit: Meteor.settings.public.dataNumberPerPage.fscLogs,
    disableOplog: true
  });
});

// 一分鐘最多20次
limitSubscription('fscLogs');
