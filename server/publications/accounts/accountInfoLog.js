import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Counts } from 'meteor/tmeasday:publish-counts';

import { limitSubscription } from '/server/imports/utils/rateLimit';
import { dbLog, logTypeGroupMap } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('accountInfoLog', function({ userId, logTypeGroups, offset }) {
  debug.log('publish accountInfoLog', { userId, logTypeGroups, offset });
  check(userId, String);
  check(logTypeGroups, Match.Optional([String]));
  check(offset, Match.Integer);

  // 處理金管會紀錄最後讀取時間
  // TODO: 將通知獨立於 log 機制
  if (this.userId === userId && logTypeGroups && logTypeGroups.includes('fsc')) {
    Meteor.users.update({
      _id: userId
    }, {
      $set: { 'profile.lastReadFscLogDate': new Date() }
    });
  }

  const firstLogData = dbLog.findOne({ userId }, { sort: { createdAt: 1 } });
  const firstLogDate = firstLogData ? firstLogData.createdAt : new Date();

  const filter = {
    userId: { $in: [userId, '!all'] },
    createdAt: { $gte: firstLogDate }
  };

  if (logTypeGroups) {
    filter.logType = {
      $in: logTypeGroups.reduce((logTypes, logTypeGroup) => {
        return [...logTypes, ...logTypeGroupMap[logTypeGroup].logTypes];
      }, [])
    };
  }

  Counts.publish(this, 'accountInfoLogs', dbLog.find(filter, { fields: { _id: 1 } }), { noReady: true });

  return dbLog.find(filter, {
    sort: { createdAt: -1 },
    skip: offset,
    limit: Meteor.settings.public.dataNumberPerPage.accountInfoLogs,
    disableOplog: true
  });
});

// 一分鐘最多20次
limitSubscription('accountInfoLog');
