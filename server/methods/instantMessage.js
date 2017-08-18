'use strict';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { dbLog } from '../../db/dbLog';

Meteor.methods({
  instantMessageChat(message) {
    check(this.userId, String);
    check(message, String);
    const user = Meteor.users.findOne(this.userId, {
      fields: {
        username: 1
      }
    });
    const username = user.username;
    dbLog.insert({
      logType: '聊天發言',
      username: [username],
      message: message,
      resolve: false,
      createdAt: new Date()
    });
  },
  queryInstantMessage(lastTime) {
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
          username: logData.username,
          companyName: logData.companyName,
          orderId: logData.orderId,
          productId: logData.productId,
          price: logData.price,
          amount: logData.amount,
          message: logData.message,
          createdAt: logTime
        }
      });

    return {lastTime, list};
  }
});
