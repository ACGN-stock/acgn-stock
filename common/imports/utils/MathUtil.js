export const MathUtil = {
  // round 至最接近的小數位
  roundToDecimalPlaces(x, d) {
    const p = Math.pow(10, d);

    return Math.round(x * p) / p;
  },

  // 超出範圍時回傳 min (if x < min) 或 max (if x > max)；否則回傳 x
  clamp(x, min, max) {
    return Math.min(Math.max(x, min), max);
  }
};
