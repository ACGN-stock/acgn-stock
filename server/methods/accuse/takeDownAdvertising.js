import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbAdvertising } from '/db/dbAdvertising';
import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

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

  guardUser(user).checkHasRole('fscMember');

  const { userId, message } = dbAdvertising.findByIdOrThrow(advertisingId);

  dbLog.insert({
    logType: '撤銷廣告',
    userId: [user._id, userId],
    data: { message },
    createdAt: new Date()
  });
  dbAdvertising.remove(advertisingId);
}
