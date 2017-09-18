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
  //中位數次序
  const midSequence = Math.round(companiesNumber / 2);
  //取得價格排序為中位的公司
  const midCompanyData = dbCompanies.findOne(
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
      skip: midSequence
    }
  );
  if (midCompanyData) {
    //取得最後成交價格的中位數
    const midPrice = midCompanyData.lastPrice;
    //設定低價股價格門檻
    dbVariables.set('lowPriceThreshold', Math.ceil(midPrice / 4));
  }
}
setLowPriceThreshold();