import { dbArena } from '/db/dbArena';

// 取得目前的亂鬥大賽（最近一次開始的亂鬥大賽）
export function getCurrentArena() {
  return dbArena.findOne({}, { sort: { beginDate: -1 } });
}
