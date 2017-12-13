import { dbRound } from '/db/dbRound';

// 取得目前的賽季（最近一次開始的賽季）
export function getCurrentRound() {
  return dbRound.findOne({}, { sort: { beginDate: -1 } });
}
