'use strict';
import { Meteor } from 'meteor/meteor';
import { checkFoundCompany } from './foundation';
import { paySalary } from './salary';
import { earnProfit } from './product';
import { tradeStocks, releaseStocks } from './order';
import { electManager } from './company';
import { dbSeasonRecord } from '../db/dbSeasonRecord';
import { config } from '../config';

Meteor.setInterval(doIntervalWork, config.intervalTimer);

//週期工作檢查
function doIntervalWork() {
  //檢查所有創立中且投資時間截止的公司是否成功創立
  checkFoundCompany();
  //當發薪時間到時，發給所有驗證通過的使用者薪水
  paySalary();
  //處理使用者的股票買賣訂單
  tradeStocks();
  //隨機時間讓符合條件的公司釋出股票
  releaseStocks();
  //商業季度結束檢查
  doSeasonWorks();
}

//商業季度結束檢查
function doSeasonWorks() {
  let seasonRecord = dbSeasonRecord.findOne();
  if (! seasonRecord) {
    dbSeasonRecord.insert({
      startDate: new Date(),
      endDate: new Date(Date.now() + config.seasonTime)
    });
    seasonRecord = dbSeasonRecord.findOne();
  }
  if (Date.now() >= seasonRecord.endDate.getTime()) {
    //當商業季度結束時，結算所有公司的營利額，推進所有產品的狀態進度，並根據上季產品的數量發給使用者推薦票。
    earnProfit();
    //當商業季度結束時，若有正在競選經理人的公司，則計算出選舉結果。
    electManager();
    //更新商業季度
    dbSeasonRecord.update(seasonRecord._id, {
      $set: {
        startDate: new Date(),
        endDate: new Date(Date.now() + config.seasonTime)
      }
    });
  }
}

Meteor.publish('seasonRecord', function () {
  return dbSeasonRecord.findOne();
});
