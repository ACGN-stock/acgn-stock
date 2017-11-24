function escapeRegExp(string) {
  // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildSearchRegExp(keyword, matchType) {
  if (matchType === 'exact') {
    // 直接照原樣比對關鍵字
    return new RegExp(escapeRegExp(keyword), 'i');
  }

  if (matchType === 'fuzzy') {
    // 將關鍵字拆成一個一個字，比對中間插入任何字元的狀況
    const patternString = keyword
      .split('')
      .map(escapeRegExp)
      .join('.*');

    return new RegExp(patternString, 'i');
  }
}
