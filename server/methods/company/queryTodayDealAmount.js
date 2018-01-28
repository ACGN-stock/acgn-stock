import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbLog } from '/db/dbLog';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  queryTodayDealAmount(companyId) {
    check(companyId, String);

    return queryTodayDealAmount(companyId);
  }
});
function queryTodayDealAmount(companyId) {
  debug.log('queryTodayDealAmount', companyId);
  let data = 0;
  dbLog
    .find(
      {
        logType: '交易紀錄',
        companyId: companyId,
        createdAt: {
          $gte: new Date(Date.now() - 86400000)
        }
      },
      {
        fields: {
          'data.amount': 1,
          createdAt: 1
        }
      }
    )
    .forEach((logData) => {
      data += logData.data.amount;
    });

  return data;
}
// 一分鐘最多20次
limitMethod('queryTodayDealAmount');
