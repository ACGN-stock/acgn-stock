'use strict';
import { Meteor } from 'meteor/meteor';
import { checkFoundCompany } from './foundation';
import { paySalary } from './salary';
// import { earnProfit } from './product';
// import { electManager, recordListPrice, releaseStocks } from './company';
import { recordListPrice, releaseStocks } from './company';
// import { dbConfig } from '../db/dbConfig';
import { config } from '../config';
import { threadId, shouldReplaceThread } from './thread';
import { dbResourceLock } from '../db/dbResourceLock';

Meteor.startup(function() {
  Meteor.setInterval(intervalCheck, config.intervalTimer);
});

function intervalCheck() {
  const inrervalCheckLock = dbResourceLock.findOne('intervalCheck');
  if (! inrervalCheckLock) {
    dbResourceLock.insert({
      _id: 'intervalCheck',
      task: 'intervalCheck',
      threadId: threadId,
      time: new Date()
    });
    doIntervalWork();
  }
  else if (inrervalCheckLock.threadId === threadId) {
    doIntervalWork();
  }
  else if (shouldReplaceThread(inrervalCheckLock.threadId)) {
    dbResourceLock.update('intervalCheck', {
      $set: {
        threadId: threadId,
        time: new Date()
      }
    });
    doIntervalWork();
  }
}

//週期檢查工作內容
function doIntervalWork() {
  //檢查所有創立中且投資時間截止的公司是否成功創立
  checkFoundCompany();
  //當發薪時間到時，發給所有驗證通過的使用者薪水
  paySalary();
  //隨機時間讓符合條件的公司釋出股票
  releaseStocks();
  //隨機時間紀錄公司的參考價格
  recordListPrice();
  //商業季度結束檢查
  // doSeasonWorks();
}

//商業季度結束檢查
// function doSeasonWorks() {
//   const configData = dbConfig.findOne();
//   if (Date.now() >= configData.currentSeasonEndDate.getTime()) {
//     //當商業季度結束時，結算所有公司的營利額，推進所有產品的狀態進度，並根據上季產品的數量發給使用者推薦票。
//     earnProfit();
//     //當商業季度結束時，若有正在競選經理人的公司，則計算出選舉結果。
//     electManager();
//     //更新商業季度
//     dbConfig.update(configData._id, {
//       $set: {
//         currentSeasonStartDate: new Date(),
//         currentSeasonEndDate: new Date(Date.now() + config.seasonTime),
//         lastSeasonStartDate: configData.currentSeasonStartDate,
//         lastSeasonEndDate: configData.currentSeasonEndDate
//       }
//     });
//   }
// }


