import { _ } from 'meteor/underscore';

import { dbLog } from '/db/dbLog';
import { dbEmployees } from '/db/dbEmployees';

/*
 * 計算系統中的活躍玩家數量
 *
 * 目前的活躍玩家定義：於七天內有參與投資、購買下單、販賣下單、推薦產品與報名員工等任一紀錄之玩家。
 */
export function computeActiveUserCount() {
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

  // 有報名員工的玩家
  const activeUsersByEmployee = _.pluck(
    dbEmployees.aggregate([ {
      $match: { registerAt: { $gte: lookbackDate } }
    }, {
      $group: { _id: '$userId' }
    } ]),
    '_id'
  );

  // 以上所有條件的聯集
  const activeUsers = [...new Set([...activeUsersByLog, ...activeUsersByEmployee])];

  return activeUsers.length;
}
