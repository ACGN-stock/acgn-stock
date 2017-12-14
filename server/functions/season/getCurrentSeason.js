import { dbSeason } from '/db/dbSeason';

// 取得目前的商業季度（最近一次開始的商業季度）
export function getCurrentSeason() {
  return dbSeason.findOne({}, { sort: { beginDate: -1 } });
}
