import { dbVariables } from '/db/dbVariables';

// 運用 dbVariables 進行各項倒數
export const countdownManager = {
  // 是否已初始化（為有限數字）
  isInitialized(key) {
    const value = dbVariables.get(key);

    return typeof value === 'number' && isFinite(value);
  },

  // 設定倒數值
  set(key, value) {
    dbVariables.set(key, parseInt(value, 10) || 0);
  },

  // 進行一步倒數
  countDown(key) {
    dbVariables.update(key, { $inc: { value: -1 } });
  },

  // 是否已倒數到零
  isZeroReached(key) {
    const value = dbVariables.get(key);

    return value && value <= 0;
  }
};
