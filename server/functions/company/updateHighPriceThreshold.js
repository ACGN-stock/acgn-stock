import { dbCompanies } from '/db/dbCompanies';
import { dbVariables } from '/db/dbVariables';
import { debug } from '/server/imports/utils/debug';

// 更新高價股的價格門檻
export function updateHighPriceThreshold() {
  debug.log('updateHighPriceThreshold');

  const companyCount = dbCompanies.find({ isSeal: false }).count();

  if (companyCount === 0) {
    dbVariables.set('highPriceThreshold', Infinity);

    return;
  }

  const thresholdPosition = Math.floor(companyCount * (14 - 1.5 * Math.log(companyCount)) / 100);

  const companyData = dbCompanies.findOne({ isSeal: false }, {
    fields: { lastPrice: 1 },
    sort: { lastPrice: -1 },
    skip: thresholdPosition
  });

  const highPriceThreshold = companyData ? companyData.lastPrice : Infinity;

  dbVariables.set('highPriceThreshold', highPriceThreshold);
}
