import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbAdvertising } from '/db/dbAdvertising';
import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  takeDownAdvertising(advertisingId) {
    check(this.userId, String);
    check(advertisingId, String);
    takeDownAdvertising(Meteor.user(), advertisingId);

    return true;
  }
});
function takeDownAdvertising(user, advertisingId) {
  debug.log('takeDownAdvertising', { user, advertisingId });
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '您並非金融管理會委員，無法進行此操作！');
  }
  const advertisingData = dbAdvertising.findOne(advertisingId);
  if (! advertisingData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + advertisingId + '」的廣告！');
  }
  dbLog.insert({
    logType: '撤銷廣告',
    userId: [user._id, advertisingData.userId],
    data: {
      message: advertisingData.message
    },
    createdAt: new Date()
  });
  dbAdvertising.remove(advertisingId);
}
