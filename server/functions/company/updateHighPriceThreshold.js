import { dbCompanies } from '/db/dbCompanies';
import { dbVariables } from '/db/dbVariables';
import { debug } from '/server/imports/utils/debug';

// 更新高價股的價格門檻
export function updateHighPriceThreshold() {
  debug.log('updateHighPriceThreshold');

  const companyCount = dbCompanies.find({ isSeal: false }).count();
  const thresholdPosition = Math.floor(companyCount * 0.05);

  const companyData = dbCompanies.findOne({ isSeal: false }, {
    fields: { lastPrice: 1 },
    sort: { lastPrice: -1 },
    skip: thresholdPosition
  });

  const highPriceThreshold = companyData ? companyData.lastPrice : Infinity;

  dbVariables.set('highPriceThreshold', highPriceThreshold);
}
