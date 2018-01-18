import { dbCompanies } from '/db/dbCompanies';
import { dbVariables } from '/db/dbVariables';
import { debug } from '/server/imports/utils/debug';

// 計算所謂「低價股」的價格門檻
export function updateLowPriceThreshold() {
  debug.log('updateLowPriceThreshold');
  const companiesNumber = dbCompanies.find({ isSeal: false }).count();

  // 四分位數次序
  const quartileSequence = Math.round(companiesNumber * 3 / 4);

  // 取得價格排序為第一四分位的公司
  const quartileCompanyData = dbCompanies.findOne({ isSeal: false }, {
    fields: { lastPrice: 1 },
    sort: { lastPrice: -1 },
    skip: quartileSequence
  });

  const lowPriceThreshold = quartileCompanyData ? quartileCompanyData.lastPrice : 0;

  // 設定低價股價格門檻
  dbVariables.set('lowPriceThreshold', lowPriceThreshold);
}
