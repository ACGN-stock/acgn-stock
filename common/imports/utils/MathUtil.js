export const MathUtil = {
  // round 至最接近的小數位
  roundToDecimalPlaces(x, d) {
    const p = Math.pow(10, d);

    return Math.round(x * p) / p;
  }
};
