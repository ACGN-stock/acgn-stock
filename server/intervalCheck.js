import { Meteor } from 'meteor/meteor';
import { UserStatus } from 'meteor/mizzao:user-status';

import { eventScheduler } from '/server/imports/utils/eventScheduler';
import { dbAdvertising } from '/db/dbAdvertising';
import { dbLog } from '/db/dbLog';
import { updateLowPriceThreshold } from './functions/company/updateLowPriceThreshold';
import { updateHighPriceThreshold } from './functions/company/updateHighPriceThreshold';
import { getCurrentSeason } from './functions/season/getCurrentSeason';
import { generateNewSeason } from './functions/season/generateNewSeason';
import { doSeasonWorks } from './functions/season/doSeasonWorks';
import { getCurrentRound } from './functions/round/getCurrentRound';
import { doRoundWorks } from './functions/round/doRoundWorks';
import { checkExpiredFoundations } from './functions/foundation/checkExpiredFoundations';
import { debug } from '/server/imports/utils/debug';

//週期檢查工作內容
export function doIntervalWork() {
  debug.log('doIntervalWork');
  const now = Date.now();
  const currentRoundData = getCurrentRound();
  const currentSeasonData = getCurrentSeason();

  // TODO 整理賽季與商業季度的生成與結束判斷處理流程
  if (! currentSeasonData) {
    //產生新的商業季度
    generateNewSeason();
  }

  if (now >= currentRoundData.endDate.getTime()) {
    //賽季結束工作
    doRoundWorks();
  }
  else if (now >= currentSeasonData.endDate.getTime()) {
    //商業季度結束工作
    doSeasonWorks();
  }
  else {
    // 更新高低價位股價門檻
    updateLowPriceThreshold();
    updateHighPriceThreshold();
    //檢查所有創立中且投資時間截止的公司是否成功創立
    checkExpiredFoundations();
    // 觸發排程事件
    eventScheduler.triggerOverdueEvents();
  }

  // 清潔工作
  cleanUp();
}

function cleanUp() {
  //移除所有一分鐘以前的聊天發言紀錄
  dbLog.remove({
    logType: '聊天發言',
    createdAt: { $lt: new Date(Date.now() - 60000) }
  });

  //移除所有到期的廣告
  dbAdvertising.remove({ createdAt: { $lt: new Date(Date.now() - Meteor.settings.public.advertisingExpireTime) } });

  //移除5分鐘以上的resource lock
  // dbResourceLock
  //   .find({ time: { $lt: new Date(Date.now() - 300000) } })
  //   .forEach((lockData) => {
  //     console.log(JSON.stringify(lockData) + ' locked time over 5 min...automatic release!');
  //     dbResourceLock.remove(lockData._id);
  //   });

  //移除所有debug紀錄
  debug.clean();

  //移除沒有IP地址的user connections
  UserStatus.connections.remove({ ipAddr: { $exists: false } });
}
