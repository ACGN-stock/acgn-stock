import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/debug';

Meteor.methods({
  accuseSomething(message) {
    check(this.userId, String);
    check(message, String);
    accuseSomething(Meteor.user(), message);

    return true;
  }
});
function accuseSomething(user, message) {
  debug.log('accuseSomething', {user, message});
  if (_.contains(user.profile.ban, 'accuse')) {
    throw new Meteor.Error(403, '您現在被金融管理會禁止了所有舉報違規行為！');
  }
  dbLog.insert({
    logType: '通報金管',
    userId: [user._id],
    data: {
      reason: message
    },
    createdAt: new Date()
  });
}
