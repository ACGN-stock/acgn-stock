'use strict';
import { Meteor } from 'meteor/meteor';
import { checkFoundCompany } from './foundation';
import { paySalary } from './salary';
import { recordListPrice, releaseStocks } from './company';
import { doSeasonWorks } from './season';
import { threadId, shouldReplaceThread } from './thread';
import { dbResourceLock } from '../db/dbResourceLock';
import { config } from '../config';

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
  else if ((Date.now() - inrervalCheckLock.time.getTime()) > (config.intervalTimer * 3)) {
    dbResourceLock.update('intervalCheck', {
      $set: {
        threadId: threadId,
        time: new Date()
      }
    });
    doIntervalWork();
  }
  else if (inrervalCheckLock.threadId === threadId) {
    dbResourceLock.update('intervalCheck', {
      $set: {
        time: new Date()
      }
    });
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
  // //檢查所有創立中且投資時間截止的公司是否成功創立
  checkFoundCompany();
  // //當發薪時間到時，發給所有驗證通過的使用者薪水
  paySalary();
  // //隨機時間讓符合條件的公司釋出股票
  releaseStocks();
  // //隨機時間紀錄公司的參考價格
  recordListPrice();
  // //商業季度結束檢查
  doSeasonWorks();
}
