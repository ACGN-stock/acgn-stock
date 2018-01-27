import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbLog } from '/db/dbLog';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
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
          data: logData.data,
          createdAt: logTime
        };
      });

    return { lastTime, list };
  }
});
// 一分鐘最多24次
limitMethod('queryInstantMessage', 24);
