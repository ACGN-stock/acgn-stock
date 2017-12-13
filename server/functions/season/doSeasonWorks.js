import { Meteor } from 'meteor/meteor';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbCompanies } from '/db/dbCompanies';
import { dbEmployees } from '/db/dbEmployees';
import { dbPrice } from '/db/dbPrice';
import { dbResourceLock } from '/db/dbResourceLock';
import { dbVariables } from '/db/dbVariables';
import { dbValidatingUsers } from '/db/dbValidatingUsers';
import { dbVoteRecord } from '/db/dbVoteRecord';
import { debug } from '/server/imports/utils/debug';
import { updateCompanyGrades } from '../company/updateCompanyGrades';
import { giveBonusByStocksFromProfit } from '../company/giveBonusByStocksFromProfit';
import { getCurrentRound } from '../round/getCurrentRound';
import { startArenaFight } from '../arena/startArenaFight';
import { cancelAllOrder } from '../order/cancelAllOrder';
import { processEndVacationRequests } from '../vacation/processEndVacationRequests';
import { postponeInVacationTaxes } from '../vacation/postponeInVacationTaxes';
import { getCurrentSeason } from './getCurrentSeason';
import { generateNewSeason } from './generateNewSeason';
import { generateRankAndTaxesData } from './generateRankAndTaxesData';

//商業季度結束工作
export function doSeasonWorks() {
  const currentRoundData = getCurrentRound();
  const currentSeasonData = getCurrentSeason();
  debug.log('doSeasonWorks', { currentRoundData, currentSeasonData });
  //避免執行時間過長導致重複進行季節結算
  if (dbResourceLock.findOne('season')) {
    return false;
  }
  console.info(new Date().toLocaleString() + ': doSeasonWorks');
  resourceManager.request('doSeasonWorks', ['season'], (release) => {
    //當商業季度結束時，取消所有尚未交易完畢的訂單
    cancelAllOrder();
    //若arenaCounter為0，則舉辦最萌亂鬥大賽
    const arenaCounter = dbVariables.get('arenaCounter');
    if (arenaCounter === 0) {
      startArenaFight();
    }
    //當商業季度結束時，結算所有公司的營利額並按照股權分給股東。
    giveBonusByStocksFromProfit();
    // 更新所有公司的評級
    updateCompanyGrades();
    //為所有公司與使用者進行排名結算
    generateRankAndTaxesData(currentSeasonData);
    //所有公司當季正營利額歸零
    dbCompanies.update({ profit: { $gt: 0 } }, { $set: { profit: 0 } }, { multi: true });
    //遣散所有在職員工
    dbEmployees.update({ employed: true }, { $set: { employed: false, resigned: true } }, { multi: true });

    //產生新的商業季度
    generateNewSeason();

    // 最後兩個商業季度強制使用者收假
    if (currentRoundData.endDate.getTime() - Date.now() <= Meteor.settings.public.seasonTime * 2) {
      Meteor.users.update({ 'profile.isInVacation': true }, {
        $set: { 'profile.isInVacation': false }
      }, {
        multi: true
      });
    }
    // 處理使用者收假
    processEndVacationRequests();
    // 延後放假中使用者的繳稅期限
    postponeInVacationTaxes();

    //移除所有七天前的股價紀錄
    dbPrice.remove({ createdAt: { $lt: new Date(Date.now() - 604800000) } });
    //移除所有待驗證註冊資料
    dbValidatingUsers.remove({});
    //移除所有推薦票投票紀錄
    dbVoteRecord.remove({});
    //本季度未登入天數歸0
    Meteor.users.update({}, { $set: { 'profile.noLoginDayCount': 0 } }, { multi: true });

    release();
  });
}
