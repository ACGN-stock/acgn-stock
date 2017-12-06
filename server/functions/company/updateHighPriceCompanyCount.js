import { dbCompanies } from '/db/dbCompanies';
import { dbVariables } from '/db/dbVariables';

// 更新高價公司的總數
export function updateHighPriceCompanyCount() {
  const companyCount = dbCompanies.find({ isSeal: false }).count();
  const highPriceCompanyCount = Math.floor(companyCount * 0.05); // TODO 抽出為 config
  dbVariables.set('highPriceCompanyCount', highPriceCompanyCount);
}
