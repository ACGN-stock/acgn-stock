'use strict';
import { _ } from 'meteor/underscore';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { dbLog } from '../../db/dbLog';
import { limitMethod } from './rateLimit';
import { debug } from '../debug';

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
      message: message,
      createdAt: new Date()
    });
  },
  queryInstantMessage(lastTime) {
    debug.log('queryInstantMessage', lastTime);
    check(lastTime, Number);
    lastTime = Math.max(Date.now() - 60000, lastTime);
    const list = dbLog
      .find(
        {
          createdAt: {
            $gt: new Date(lastTime)
          }
        },
        {
          disableOplog: true
        }
      )
      .map((logData) => {
        const logTime = logData.createdAt.getTime();
        lastTime = Math.max(lastTime, logTime);

        return {
          _id: logData._id.toHexString(),
          logType: logData.logType,
          userId: logData.userId,
          companyId: logData.companyId,
          orderId: logData.orderId,
          productId: logData.productId,
          price: logData.price,
          amount: logData.amount,
          message: logData.message,
          createdAt: logTime
        };
      });

    return {lastTime, list};
  }
});
//5秒鐘最多2次
limitMethod('instantMessageChat', 2, 5000);
//一分鐘最多24次
limitMethod('queryInstantMessage', 24);
