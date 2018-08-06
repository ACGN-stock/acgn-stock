import { _ } from 'meteor/underscore';

import { dbLog } from '/db/dbLog';

/*
 * 計算系統中的活躍玩家數量
 *
 * 目前的活躍玩家定義：於七天內有參與投資、購買下單、販賣下單、推薦產品與報名員工等任一紀錄之玩家。
 */
export function computeActiveUserIds() {
  // 往回統計的時間
  const lookbackDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 有紀錄的玩家
  const activeUsersByLog = _.pluck(
    dbLog.aggregate([ {
      $match: {
        logType: { $in: ['參與投資', '購買下單', '販賣下單', '推薦產品'] },
        createdAt: { $gte: lookbackDate }
      }
    }, {
      $group: { _id: { $arrayElemAt: ['$userId', 0] } }
    } ]),
    '_id'
  );

  return activeUsersByLog;
}
