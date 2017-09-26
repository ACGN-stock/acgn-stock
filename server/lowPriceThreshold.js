'use strict';
import { dbCompanies } from '../db/dbCompanies';
import { dbVariables } from '../db/dbVariables';
import { debug } from './debug';

//計算所謂「低價股」的價格門檻
export function setLowPriceThreshold() {
  debug.log('setLowPriceThreshold');
  const companiesNumber = dbCompanies
    .find({
      isSeal: false
    })
    .count();
  //四分位數次序
  const quartileSequence = Math.round(companiesNumber * 3 / 4);
  //取得價格排序為第一四分位的公司
  const quartileCompanyData = dbCompanies.findOne(
    {
      isSeal: false
    },
    {
      fields: {
        lastPrice: 1
      },
      sort: {
        lastPrice: -1
      },
      skip: quartileSequence
    }
  );
  if (quartileCompanyData) {
    //取得最後成交價格的第一四分位數
    const quartilePrice = quartileCompanyData.lastPrice;
    //設定低價股價格門檻
    dbVariables.set('lowPriceThreshold', quartilePrice);
  }
}
setLowPriceThreshold();