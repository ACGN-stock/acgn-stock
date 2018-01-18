import { _ } from 'meteor/underscore';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbLog } from '/db/dbLog';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  instantMessageChat(message) {
    debug.log('instantMessageChat');
    check(this.userId, String);
    check(message, String);
    const user = Meteor.users.findOne(this.userId, {
      fields: {
        profile: 1
      }
    });
    if (_.contains(user.profile.ban, 'chat')) {
      throw new Meteor.Error(403, '您現在被金融管理會禁止了所有聊天發言行為！');
    }
    dbLog.insert({
      logType: '聊天發言',
      userId: [this.userId],
      data: { message },
      createdAt: new Date()
    });
  }
});
// 5秒鐘最多2次
limitMethod('instantMessageChat', 2, 5000);
