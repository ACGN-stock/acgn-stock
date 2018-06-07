import { Meteor } from 'meteor/meteor';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { dbLog, importantFscLogTypeList } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('lastImportantFscLogDate', function() {
  debug.log('publish lastImportantFscLogDate');
  const userId = this.userId;
  if (! userId) {
    return [];
  }

  this.added('variables', 'lastImportantFscLogDate', {
    value: null
  });
  const observer = dbLog.find({
    logType: { $in: importantFscLogTypeList },
    userId,
    'userId.0': { $ne: userId }
  }, {
    sort: { createdAt: -1 },
    limit: 1
  }).observeChanges({
    added: (id, fields) => {
      this.changed('variables', 'lastImportantFscLogDate', {
        value: fields.createdAt
      });
    }
  });
  this.ready();
  this.onStop(() => {
    observer.stop();
  });
});
// 一分鐘最多20次
limitSubscription('lastImportantFscLogDate');
