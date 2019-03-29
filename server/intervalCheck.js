import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { UserStatus } from 'meteor/mizzao:user-status';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { debug } from '/server/imports/utils/debug';
import { backupMongo } from '/server/imports/utils/backupMongo';
import { clearAllUserProductVouchers } from '/server/functions/product/vouchers/clearAllUserProductVouchers';
import { deliverProductVouchers } from '/server/functions/product/vouchers/deliverProductVouchers';
import { resetAllUserVoteTickets } from '/server/functions/product/voteTickets/resetAllUserVoteTickets';
import { deliverProductVotingRewards } from '/server/functions/product/voteTickets/deliverProductVotingRewards';
import { hireEmployees } from '/server/functions/employee/hireEmployees';
import { autoRegisterEmployees } from '/server/functions/employee/autoRegisterEmployees';
import { updateFoundationVariables } from '/server/functions/foundation/updateFoundationVariables';
import { dbAdvertising } from '/db/dbAdvertising';
import { dbArena, getCurrentArena } from '/db/dbArena';
import { dbArenaFighters } from '/db/dbArenaFighters';
import { dbArenaLog } from '/db/dbArenaLog';
import { dbCompanies } from '/db/dbCompanies';
import { dbCompanyStones } from '/db/dbCompanyStones';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { dbDirectors } from '/db/dbDirectors';
import { dbEmployees } from '/db/dbEmployees';
import { dbFoundations } from '/db/dbFoundations';
import { dbLog, fscLogTypeList } from '/db/dbLog';
import { dbOrders } from '/db/dbOrders';
import { dbPrice } from '/db/dbPrice';
import { dbProducts } from '/db/dbProducts';
import { dbResourceLock } from '/db/dbResourceLock';
import { dbRound, getCurrentRound } from '/db/dbRound';
import { dbSeason, getCurrentSeason } from '/db/dbSeason';
import { dbVips } from '/db/dbVips';
import { dbTaxes } from '/db/dbTaxes';
import { dbUserArchive } from '/db/dbUserArchive';
import { dbUserOwnedProducts } from '/db/dbUserOwnedProducts';
import { dbVariables } from '/db/dbVariables';
import { dbValidatingUsers } from '/db/dbValidatingUsers';
import { dbVoteRecord } from '/db/dbVoteRecord';
import { dbRankCompanyCapital } from '/db/dbRankCompanyCapital';
import { dbRankCompanyPrice } from '/db/dbRankCompanyPrice';
import { dbRankCompanyProfit } from '/db/dbRankCompanyProfit';
import { dbRankCompanyValue } from '/db/dbRankCompanyValue';
import { dbRankUserWealth } from '/db/dbRankUserWealth';
import { updateLowPriceThreshold } from './functions/company/updateLowPriceThreshold';
import { updateHighPriceThreshold } from './functions/company/updateHighPriceThreshold';
import { summarizeAndDistributeProfits } from './functions/company/summarizeAndDistributeProfits';
import { updateCompanyBaseProductionFunds } from './functions/company/updateCompanyBaseProductionFunds';
import { updateCompanyProductPriceLimits } from './functions/company/updateCompanyProductPriceLimits';
import { checkChairman } from './functions/company/checkChairman';
import { updateCompanyGrades } from './functions/company/updateCompanyGrades';
import { deliverProductRebates } from './functions/product/deliverProductRebates';
import { returnCompanyStones } from './functions/miningMachine/returnCompanyStones';
import { generateMiningProfits } from './functions/miningMachine/generateMiningProfits';
import { rotateProducts } from './functions/product/rotateProducts';
import { adjustPreviousSeasonVipScores } from './functions/vip/adjustPreviousSeasonVipScores';
import { levelDownThresholdUnmetVips } from './functions/vip/levelDownThresholdUnmetVips';
import { startArenaFight } from './arena';
import { checkExpiredFoundations } from './functions/foundation/checkExpiredFoundations';
import { generateRankAndTaxesData } from './seasonRankAndTaxes';
import { eventScheduler } from './imports/utils/eventScheduler';

// 週期檢查工作內容
export function doIntervalWork() {
  debug.log('doIntervalWork');
  const now = Date.now();
  const lastRoundData = getCurrentRound();
  const lastSeasonData = getCurrentSeason();
  if (! lastSeasonData) {
    // 產生新的商業季度
    generateNewSeason();
  }
  if (now >= lastRoundData.endDate.getTime()) {
    // 賽季結束工作
    doRoundWorks(lastRoundData, lastSeasonData);
  }
  else if (now >= lastSeasonData.endDate.getTime()) {
    // 商業季度結束工作
    doSeasonWorks(lastRoundData, lastSeasonData);
  }
  else {
    // 更新高低價位股價門檻
    updateLowPriceThreshold();
    updateHighPriceThreshold();
    // 檢查所有創立中且投資時間截止的公司是否成功創立
    checkExpiredFoundations();
    // 觸發所有到期的排程事件
    eventScheduler.triggerOverdueEvents();
  }
  // 移除所有一分鐘以前的聊天發言紀錄
  dbLog.remove({
    logType: '聊天發言',
    createdAt: { $lt: new Date(Date.now() - 60000) }
  });
  // 移除所有到期的廣告
  dbAdvertising.remove({ createdAt: { $lt: new Date(Date.now() - Meteor.settings.public.advertisingExpireTime) } });
  // 移除5分鐘以上的resource lock
  // dbResourceLock
  //   .find({
  //     time: {
  //       $lt: new Date(Date.now() - 300000)
  //     }
  //   })
  //   .forEach((lockData) => {
  //     console.log(JSON.stringify(lockData) + ' locked time over 5 min...automatic release!');
  //     dbResourceLock.remove(lockData._id);
  //   });
  // 移除所有debug紀錄
  debug.clean();
  // 移除沒有IP地址的user connections
  UserStatus.connections.remove({ ipAddr: { $exists: false } });
}

// 賽季結束工作
export function doRoundWorks(lastRoundData, lastSeasonData) {
  debug.log('doRoundWorks', lastSeasonData);
  // 避免執行時間過長導致重複進行賽季結算
  if (dbResourceLock.findOne('season')) {
    return false;
  }
  console.info(`${new Date().toLocaleString()}: doRoundWorks`);
  resourceManager.request('doRoundWorks', ['season'], (release) => {
    // TODO 合併處理商業季度結束的 code

    // 備份資料庫
    backupMongo('-roundBefore');

    // 無論如何都要舉辦最萌亂鬥大賽
    dbVariables.set('arenaCounter', 0);
    // 進行亂鬥, 營利, 分紅, 獎勵金, 稅金等結算
    finalizeCurrentSeason(lastSeasonData);
    // 更新所有公司的董事長，避免最終資料出現與董事會清單不一致的狀況
    checkChairman();

    // 賽季結束時歸還所有石頭
    dbCompanyStones
      .aggregate([ { $group: { _id: '$companyId' } } ])
      .forEach(({ _id: companyId }) => {
        returnCompanyStones(companyId);
      });

    backupMongo('-roundAfter');

    // 保管所有未查封公司的狀態
    dbCompanies
      .find({ isSeal: false }, {
        fields: {
          _id: 1,
          tags: 1,
          pictureSmall: 1,
          pictureBig: 1,
          description: 1
        }
      })
      .forEach(({ _id, tags, pictureSmall, pictureBig, description }) => {
        dbCompanyArchive.update(_id, {
          $set: {
            status: 'archived',
            tags,
            pictureSmall,
            pictureBig,
            description
          }
        });
      });
    dbCompanyArchive.remove({ status: 'foundation' });
    dbCompanyArchive.remove({ status: 'market' });

    // 移除所有廣告
    dbAdvertising.remove({});

    // 移除所有公司資料
    dbCompanies.remove({});
    dbCompanyStones.remove({});
    // 移除所有股份資料
    dbDirectors.remove({});
    // 移除所有員工資料
    dbEmployees.remove({});
    // 移除所有新創資料
    dbFoundations.remove({});
    // 移除所有除了金管會相關以外的紀錄資料
    dbLog.remove({
      logType: {
        $nin: fscLogTypeList
      }
    });
    // 移除所有最萌亂鬥大賽資料
    dbArenaLog.dropAll();
    dbArenaFighters.remove({});
    dbArena.remove({});
    // 移除所有排名資訊
    dbRankCompanyCapital.remove();
    dbRankCompanyPrice.remove();
    dbRankCompanyProfit.remove();
    dbRankCompanyValue.remove();
    dbRankUserWealth.remove();
    // 移除所有訂單資料
    dbOrders.remove({});
    // 移除所有價格資料
    dbPrice.remove({});
    // 移除所有產品資料
    dbProducts.remove({});
    dbUserOwnedProducts.remove({});
    // 移除所有 VIP 資訊
    dbVips.remove({});
    // 移除所有稅金料
    dbTaxes.remove({});
    // 保管所有使用者的狀態
    Meteor.users.find({}).forEach((userData) => {
      dbUserArchive.upsert(
        {
          _id: userData._id
        },
        {
          $set: {
            status: 'archived',
            name: userData.profile.name,
            validateType: userData.profile.validateType,
            roles: userData.profile.roles,
            saintStones: userData.profile.stones.saint,
            ban: userData.profile.ban
          }
        }
      );
    });
    // 移除所有使用者資料
    Meteor.users.remove({});
    // 移除所有推薦票投票紀錄
    dbVoteRecord.remove({});
    // 清除所有賽季資訊
    dbSeason.remove({});
    // 產生新的賽季
    generateNewRound();
    // 產生新的商業季度
    generateNewSeason();
    release();
  });
}

// 商業季度結束工作
export function doSeasonWorks(lastRoundData, lastSeasonData) {
  debug.log('doSeasonWorks', { lastRoundData, lastSeasonData });
  // 避免執行時間過長導致重複進行季節結算
  if (dbResourceLock.findOne('season')) {
    return false;
  }
  console.info(`${new Date().toLocaleString()}: doSeasonWorks`);
  resourceManager.request('doSeasonWorks', ['season'], (release) => {
    // 換季開始前的資料備份
    backupMongo('-seasonBefore');

    // 進行亂鬥, 營利, 分紅, 獎勵金, 稅金等結算
    finalizeCurrentSeason(lastSeasonData);

    // 所有公司當季正營利額歸零
    dbCompanies.update({ profit: { $gt: 0 } }, { $set: { profit: 0 } }, { multi: true });
    // 遣散所有在職員工
    dbEmployees.update({ employed: true }, { $set: { employed: false, resigned: true } }, { multi: true });
    // 產生新的商業季度
    generateNewSeason();
    // 移除所有七天前的股價紀錄
    dbPrice.remove({ createdAt: { $lt: new Date(Date.now() - 604800000) } });
    // 移除所有待驗證註冊資料
    dbValidatingUsers.remove({});
    // 移除所有推薦票投票紀錄
    dbVoteRecord.remove({});
    // 本季度未登入天數歸0
    Meteor.users.update({}, { $set: { 'profile.noLoginDayCount': 0 } }, { multi: true });
    // 最後兩個商業季度強制使用者收假
    if (lastRoundData.endDate.getTime() - Date.now() <= Meteor.settings.public.seasonTime * 2) {
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
    // 換季完成後的資料備份
    backupMongo('-seasonAfter');
    release();
  });
}

// 處理所有使用者的收假要求
export function processEndVacationRequests() {
  Meteor.users.update({
    'profile.isInVacation': true,
    'profile.isEndingVacation': true
  }, {
    $set: {
      'profile.isInVacation': false,
      'profile.isEndingVacation': false
    }
  }, {
    multi: true
  });
}

// 將放假中使用者的繳稅期限延後
export function postponeInVacationTaxes() {
  const inVacationUserIds = Meteor.users
    .find({ 'profile.isInVacation': true }, { _id: 1 })
    .map(({ _id }) => {
      return _id;
    });

  dbTaxes
    .find({ userId: { $in: inVacationUserIds } }, { _id: 1, expireDate: 1 })
    .forEach(({ _id: taxId, expireDate }) => {
      dbTaxes.update({ _id: taxId }, {
        $set: { expireDate: new Date(expireDate.getTime() + Meteor.settings.public.seasonTime) }
      });
    });
}

// 取消所有尚未交易完畢的訂單
function cancelAllOrder() {
  debug.log('cancelAllOrder');
  const now = new Date();
  const userOrdersCursor = dbOrders.find({});
  if (userOrdersCursor.count() > 0) {
    const companiesBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
    const directorsBulk = dbDirectors.rawCollection().initializeUnorderedBulkOp();
    const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
    const usersBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();
    // 紀錄整個取消過程裡金錢有增加的userId及增加量
    const increaseMoneyHash = {};
    // 紀錄整個取消過程裡股份有增加的userId及增加公司及增加量
    const increaseStocksHash = {};
    userOrdersCursor.forEach((orderData) => {
      const orderType = orderData.orderType;
      const userId = orderData.userId;
      const companyId = orderData.companyId;
      const leftAmount = orderData.amount - orderData.done;
      if (orderType === '購入') {
        if (increaseMoneyHash[userId] === undefined) {
          increaseMoneyHash[userId] = 0;
        }
        increaseMoneyHash[userId] += (orderData.unitPrice * leftAmount);
      }
      else {
        if (increaseStocksHash[userId] === undefined) {
          increaseStocksHash[userId] = {};
        }
        if (increaseStocksHash[userId][companyId] === undefined) {
          increaseStocksHash[userId][companyId] = 0;
        }
        increaseStocksHash[userId][companyId] += leftAmount;
      }
      logBulk.insert({
        logType: '系統撤單',
        userId: [userId],
        companyId: companyId,
        data: {
          orderType,
          price: orderData.unitPrice,
          amount: leftAmount
        },
        createdAt: now
      });
    });
    _.each(increaseMoneyHash, (money, userId) => {
      usersBulk
        .find({
          _id: userId
        })
        .updateOne({
          $inc: {
            'profile.money': money
          }
        });
    });
    let index = 0;
    _.each(increaseStocksHash, (stocksHash, userId) => {
      // 若撤銷的是系統賣單，則降低該公司的總釋股量
      if (userId === '!system') {
        _.each(stocksHash, (stocks, companyId) => {
          companiesBulk
            .find({
              _id: companyId
            })
            .updateOne({
              $inc: {
                totalRelease: stocks * -1
              }
            });
        });
      }
      else {
        const createdAt = new Date(now.getTime() + index);
        index += 1;
        _.each(stocksHash, (stocks, companyId) => {
          if (dbDirectors.find({ companyId, userId }).count() > 0) {
            // 由於directors主鍵為Mongo Object ID，在Bulk進行find會有問題，故以companyId+userId進行搜尋更新
            directorsBulk
              .find({ companyId, userId })
              .updateOne({
                $inc: {
                  stocks: stocks
                }
              });
          }
          else {
            directorsBulk.insert({
              companyId: companyId,
              userId: userId,
              stocks: stocks,
              createdAt: createdAt
            });
          }
        });
      }
    });
    if (_.size(increaseMoneyHash) > 0) {
      usersBulk.execute = Meteor.wrapAsync(usersBulk.execute);
      usersBulk.execute();
    }
    if (_.size(increaseStocksHash) > 0) {
      if (_.size(increaseStocksHash['!system']) > 0) {
        companiesBulk.execute = Meteor.wrapAsync(companiesBulk.execute);
        companiesBulk.execute();
      }
      // 不是只有系統釋股單時
      if (! (_.size(increaseStocksHash) === 1 && increaseStocksHash['!system'])) {
        directorsBulk.execute = Meteor.wrapAsync(directorsBulk.execute);
        directorsBulk.execute();
      }
    }
    logBulk.execute = Meteor.wrapAsync(logBulk.execute);
    logBulk.execute();
    dbOrders.remove({});
  }
}

// 產生新的賽季
function generateNewRound() {
  debug.log('generateNewRound');
  const beginDate = new Date();
  const roundTime = Meteor.settings.public.seasonTime * Meteor.settings.public.seasonNumberInRound;
  const endDate = new Date(beginDate.setMinutes(0, 0, 0) + roundTime);
  const roundId = dbRound.insert({ beginDate, endDate });

  return roundId;
}

// 產生新的商業季度
function generateNewSeason() {
  debug.log('generateNewSeason');
  const seasonBeginDate = new Date();
  const seasonEndDate = new Date(seasonBeginDate.setMinutes(0, 0, 0) + Meteor.settings.public.seasonTime);
  const ordinal = dbSeason.find().count() + 1;

  const seasonId = dbSeason.insert({
    ordinal,
    beginDate: seasonBeginDate,
    endDate: seasonEndDate,
    userCount: Meteor.users.find().count(),
    companiesCount: dbCompanies.find({ isSeal: false }).count(),
    productCount: dbProducts.find({ state: 'planning' }).count()
  });

  // 更新新創相關變數設定
  if (Meteor.settings.public.foundationVariablesUpdateSeasonOrdinals.includes(ordinal)) {
    updateFoundationVariables();
  }

  // 排程經理人選舉事件
  const electTime = seasonEndDate.getTime() - Meteor.settings.public.electManagerTime;
  eventScheduler.scheduleEvent('season.electManager', electTime);

  // 重設使用者推薦票
  resetAllUserVoteTickets();
  // 發放新的消費券
  deliverProductVouchers();
  // 產品輪替
  rotateProducts();
  // 調整 VIP 分數
  adjustPreviousSeasonVipScores();
  // 排程最後出清時間
  eventScheduler.scheduleEvent('product.finalSale', seasonEndDate.getTime() - Meteor.settings.public.productFinalSaleTime);
  // 雇用所有上季報名的使用者
  hireEmployees();
  // 幫所有活躍的正職員工報名儲備員工
  autoRegisterEmployees();
  // 更新所有公司員工薪資
  dbCompanies.find().forEach((companyData) => {
    dbCompanies.update(companyData, { $set: { salary: companyData.nextSeasonSalary } });
  });
  const arenaCounter = dbVariables.get('arenaCounter') || 0;
  // 若上一個商業季度為最萌亂鬥大賽的舉辦季度，則產生新的arena Data，並排程相關事件
  if (arenaCounter <= 0) {
    const arenaShouldEndTime = seasonEndDate.getTime() + Meteor.settings.public.seasonTime * Meteor.settings.public.arenaIntervalSeasonNumber;
    const { endDate: roundEndDate } = getCurrentRound();
    const arenaEndDate = new Date(arenaShouldEndTime > roundEndDate.getTime() ? roundEndDate.getTime() : arenaShouldEndTime);
    const joinEndDate = new Date(arenaEndDate.getTime() - Meteor.settings.public.arenaJoinEndTime);
    dbArena.insert({
      beginDate: seasonBeginDate,
      endDate: arenaEndDate,
      joinEndDate
    });
    dbVariables.set('arenaCounter', Meteor.settings.public.arenaIntervalSeasonNumber);
    eventScheduler.scheduleEvent('arena.joinEnded', joinEndDate);
  }
  else {
    // 若下一個商業季度為最萌亂鬥大賽的舉辦季度，則以新產生的商業季度結束時間與更新最萌亂鬥大賽的時間，以糾正季度更換時的時間偏差
    if (arenaCounter === 1) {
      const currentArena = getCurrentArena();
      const arenaId = currentArena ? currentArena._id : null;
      if (arenaId) {
        const joinEndDate = new Date(seasonEndDate.getTime() - Meteor.settings.public.arenaJoinEndTime);
        dbArena.update(arenaId, { $set: { endDate: seasonEndDate, joinEndDate } });
        eventScheduler.scheduleEvent('arena.joinEnded', joinEndDate);
      }
    }
    // 無論如何都要倒數
    dbVariables.set('arenaCounter', arenaCounter - 1);
  }

  return seasonId;
}

// 進行亂鬥, 營利, 分紅, 獎勵金, 稅金等結算
function finalizeCurrentSeason(lastSeasonData) {
  // 當季度結束時，取消所有尚未交易完畢的訂單
  cancelAllOrder();
  // 結算挖礦機營利
  generateMiningProfits();
  // 若arenaCounter為0，則舉辦最萌亂鬥大賽
  const arenaCounter = dbVariables.get('arenaCounter');
  if (arenaCounter === 0) {
    startArenaFight();
  }
  // 進行營利結算與分紅
  summarizeAndDistributeProfits();
  // 發放推薦票回饋金
  deliverProductVotingRewards();
  // 清除所有未用完的消費券
  clearAllUserProductVouchers();
  // 發放產品購買回饋金
  deliverProductRebates();
  // 更新所有公司的評級
  updateCompanyGrades();
  // 更新所有公司的生產資金
  updateCompanyBaseProductionFunds();
  // 更新所有公司的產品價格限制
  updateCompanyProductPriceLimits();
  // 機率性降級沒有達成門檻的 VIP
  levelDownThresholdUnmetVips();
  // 為所有公司與使用者進行排名結算
  generateRankAndTaxesData(lastSeasonData);
}
