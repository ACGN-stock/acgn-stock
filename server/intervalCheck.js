import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { UserStatus } from 'meteor/mizzao:user-status';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { debug } from '/server/imports/utils/debug';
import { backupMongo } from '/server/imports/utils/backupMongo';
import { dbAdvertising } from '/db/dbAdvertising';
import { dbArena } from '/db/dbArena';
import { dbArenaFighters } from '/db/dbArenaFighters';
import { dbArenaLog } from '/db/dbArenaLog';
import { dbCompanies } from '/db/dbCompanies';
import { dbCompanyStones } from '/db/dbCompanyStones';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { dbDirectors } from '/db/dbDirectors';
import { dbEmployees } from '/db/dbEmployees';
import { dbFoundations } from '/db/dbFoundations';
import { dbLog, accuseLogTypeList } from '/db/dbLog';
import { dbOrders } from '/db/dbOrders';
import { dbPrice } from '/db/dbPrice';
import { dbProducts } from '/db/dbProducts';
import { dbResourceLock } from '/db/dbResourceLock';
import { dbRound } from '/db/dbRound';
import { dbSeason, getCurrentSeason, getInitialVoteTicketCount } from '/db/dbSeason';
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
import { updateCompanyBaseProductionFunds } from './functions/company/updateCompanyBaseProductionFunds';
import { updateCompanyProductPriceLimits } from './functions/company/updateCompanyProductPriceLimits';
import { countDownReleaseStocksForHighPrice } from './functions/company/releaseStocksForHighPrice';
import { countDownReleaseStocksForNoDeal } from './functions/company/releaseStocksForNoDeal';
import { countDownRecordListPrice } from './functions/company/recordListPrice';
import { countDownCheckChairman } from './functions/company/checkChairman';
import { updateCompanyGrades } from './functions/company/updateCompanyGrades';
import { deliverProductVotingRewards } from './functions/season/deliverProductVotingRewards';
import { deliverProductRebates } from './functions/product/deliverProductRebates';
import { returnCompanyStones } from './functions/miningMachine/returnCompanyStones';
import { generateMiningProfits } from './functions/miningMachine/generateMiningProfits';
import { rotateProducts } from './functions/product/rotateProducts';
import { adjustPreviousSeasonVipScores } from './functions/vip/adjustPreviousSeasonVipScores';
import { levelDownThresholdUnmetVips } from './functions/vip/levelDownThresholdUnmetVips';
import { startArenaFight } from './arena';
import { checkExpiredFoundations } from './functions/foundation/checkExpiredFoundations';
import { paySalaryAndCheckTax } from './paySalaryAndCheckTax';
import { generateRankAndTaxesData } from './seasonRankAndTaxes';
import { eventScheduler } from './imports/utils/eventScheduler';

// 週期檢查工作內容
export function doIntervalWork() {
  debug.log('doIntervalWork');
  const now = Date.now();
  const lastRoundData = dbRound.findOne({}, {
    sort: {
      beginDate: -1
    }
  });
  const lastSeasonData = dbSeason.findOne({}, {
    sort: {
      beginDate: -1
    }
  });
  if (! lastSeasonData) {
    // 產生新的商業季度
    generateNewSeason();
  }
  if (now >= lastRoundData.endDate.getTime()) {
    // 賽季結束工作
    doRoundWorks(lastRoundData, lastSeasonData);
  }
  else if (now >= lastSeasonData.electTime) {
    // 若有正在競選經理人的公司，則計算出選舉結果。
    electManager(lastSeasonData);
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
    // 當發薪時間到時，發給所有驗證通過的使用者薪水，並檢查賦稅、增加滯納罰金與強制繳稅
    paySalaryAndCheckTax();
    // 隨機時間讓符合條件的公司釋出股票
    countDownReleaseStocksForHighPrice();
    countDownReleaseStocksForNoDeal();
    // 隨機時間售出金管會股票並紀錄公司的參考價格
    countDownRecordListPrice();
    // 檢查並更新各公司的董事長位置
    countDownCheckChairman();
    // 觸發所有到期的排程事件
    eventScheduler.triggerOverdueEvents();
  }
  // 移除所有一分鐘以前的聊天發言紀錄
  dbLog.remove({
    logType: '聊天發言',
    createdAt: {
      $lt: new Date(Date.now() - 60000)
    }
  });
  // 移除所有到期的廣告
  dbAdvertising.remove({
    createdAt: {
      $lt: new Date(Date.now() - Meteor.settings.public.advertisingExpireTime)
    }
  });
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
  UserStatus.connections.remove({
    ipAddr: {
      $exists: false
    }
  });
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
    // 當賽季結束時，取消所有尚未交易完畢的訂單
    cancelAllOrder();
    // 結算挖礦機營利
    generateMiningProfits();
    // 賽季結束時歸還所有石頭
    dbCompanyStones
      .aggregate([ { $group: { _id: '$companyId' } } ])
      .forEach(({ _id: companyId }) => {
        returnCompanyStones(companyId);
      });
    // 若arenaCounter為0，則舉辦最萌亂鬥大賽
    const arenaCounter = dbVariables.get('arenaCounter');
    if (arenaCounter === 0) {
      startArenaFight();
    }
    // 當賽季結束時，結算所有公司的營利額並按照股權分給股東。
    giveBonusByStocksFromProfit();
    // 發放推薦票回饋金
    deliverProductVotingRewards();
    // 發放產品購買回饋金
    deliverProductRebates();
    // 機率性降級沒有達成門檻的 VIP
    levelDownThresholdUnmetVips();
    // 更新所有公司的評級
    updateCompanyGrades();
    // 更新所有公司的生產資金
    updateCompanyBaseProductionFunds();
    // 更新所有公司的產品價格限制
    updateCompanyProductPriceLimits();
    // 為所有公司與使用者進行排名結算
    generateRankAndTaxesData(lastSeasonData);
    backupMongo('-roundAfter');
    // 移除所有廣告
    dbAdvertising.remove({});

    // 移除所有公司資料
    dbCompanies.remove({});
    dbCompanyArchive.remove({});
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
        $nin: accuseLogTypeList
      }
    });
    // 移除所有與金管會相關且與公司相關的紀錄資料
    dbLog.remove({
      companyId: {
        $exists: true
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
            isAdmin: userData.profile.isAdmin,
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
    // 當商業季度結束時，取消所有尚未交易完畢的訂單
    cancelAllOrder();
    // 結算挖礦機營利
    generateMiningProfits();
    // 若arenaCounter為0，則舉辦最萌亂鬥大賽
    const arenaCounter = dbVariables.get('arenaCounter');
    if (arenaCounter === 0) {
      startArenaFight();
    }
    // 當商業季度結束時，結算所有公司的營利額並按照股權分給股東。
    giveBonusByStocksFromProfit();
    // 發放推薦票回饋金
    deliverProductVotingRewards();
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
    // 所有公司當季正營利額歸零
    dbCompanies.update(
      {
        profit: {
          $gt: 0
        }
      },
      {
        $set: {
          profit: 0
        }
      },
      {
        multi: true
      }
    );
    // 遣散所有在職員工
    dbEmployees.update(
      {
        employed: true
      },
      {
        $set: {
          employed: false,
          resigned: true
        }
      },
      {
        multi: true
      }
    );
    // 產生新的商業季度
    generateNewSeason();
    // 移除所有七天前的股價紀錄
    dbPrice.remove({
      createdAt: {
        $lt: new Date(Date.now() - 604800000)
      }
    });
    // 移除所有待驗證註冊資料
    dbValidatingUsers.remove({});
    // 移除所有推薦票投票紀錄
    dbVoteRecord.remove({});
    // 本季度未登入天數歸0
    Meteor.users.update(
      {},
      {
        $set: {
          'profile.noLoginDayCount': 0
        }
      },
      {
        multi: true
      }
    );
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
  const beginDate = new Date();
  const endDate = new Date(beginDate.setMinutes(0, 0, 0) + Meteor.settings.public.seasonTime);
  const electTime = endDate.getTime() - Meteor.settings.public.electManagerTime;
  const userCount = Meteor.users.find().count();
  const productCount = dbProducts.find({ state: 'planning' }).count();
  const companiesCount = dbCompanies.find({ isSeal: false }).count();

  const seasonId = dbSeason.insert({ beginDate, endDate, electTime, userCount, companiesCount, productCount });

  // TODO 分離「產生新商業季度」與「新商業季度開始的動作」
  const seasonData = getCurrentSeason();
  const voteTickets = getInitialVoteTicketCount(seasonData);

  Meteor.users.update({}, {
    $set: {
      'profile.vouchers': Meteor.settings.public.productVoucherAmount,
      'profile.voteTickets': voteTickets
    }
  }, { multi: true });
  // 產品輪替
  rotateProducts();
  // 調整 VIP 分數
  adjustPreviousSeasonVipScores();
  // 排程最後出清時間
  eventScheduler.scheduleEvent('product.finalSale', endDate.getTime() - Meteor.settings.public.productFinalSaleTime);
  // 雇用所有上季報名的使用者
  dbEmployees.update(
    {
      resigned: false,
      registerAt: {
        $lt: new Date(endDate.getTime() - Meteor.settings.public.seasonTime)
      }
    },
    {
      $set: {
        employed: true
      }
    },
    {
      multi: true
    }
  );
  // 更新所有公司員工薪資
  dbCompanies.find().forEach((companyData) => {
    dbCompanies.update(
      companyData,
      {
        $set: {
          salary: companyData.nextSeasonSalary
        }
      }
    );
  });
  const arenaCounter = dbVariables.get('arenaCounter') || 0;
  // 若上一個商業季度為最萌亂鬥大賽的舉辦季度，則產生新的arena Data
  if (arenaCounter <= 0) {
    const arenaEndDate = new Date(endDate.getTime() + Meteor.settings.public.seasonTime * Meteor.settings.public.arenaIntervalSeasonNumber);
    dbArena.insert({
      beginDate: beginDate,
      endDate: arenaEndDate,
      joinEndDate: new Date(arenaEndDate.getTime() - Meteor.settings.public.electManagerTime),
      shuffledFighterCompanyIdList: [],
      winnerList: []
    });
    dbVariables.set('arenaCounter', Meteor.settings.public.arenaIntervalSeasonNumber);
  }
  else {
    // 若下一個商業季度為最萌亂鬥大賽的舉辦季度，則以新產生的商業季度結束時間與選舉時間更新最萌亂鬥大賽的時間，以糾正季度更換時的時間偏差
    if (arenaCounter === 1) {
      const lastArenaData = dbArena.findOne({}, {
        sort: {
          beginDate: -1
        },
        fields: {
          _id: 1
        }
      });
      dbArena.update(lastArenaData._id, {
        $set: {
          endDate: endDate,
          joinEndDate: new Date(electTime)
        }
      });
    }
    dbVariables.set('arenaCounter', arenaCounter - 1);
  }

  return seasonId;
}

// 當商業季度結束時，結算所有公司的營利額並按照股權分給股東。
export function giveBonusByStocksFromProfit() {
  debug.log('giveBonusByStocksFromProfit');
  const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
  let needExecuteLogBulk = false;
  const usersBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();
  let needExecuteUserBulk = false;
  dbCompanies
    .find(
      {
        profit: {
          $gt: 0
        },
        isSeal: false
      },
      {
        fields: {
          _id: 1,
          manager: 1,
          totalRelease: 1,
          profit: 1,
          seasonalBonusPercent: 1
        },
        disableOplog: true
      }
    )
    .forEach((companyData) => {
      const now = Date.now();
      const companyId = companyData._id;
      const totalProfit = Math.round(companyData.profit);
      let leftProfit = totalProfit;
      logBulk.insert({
        logType: '公司營利',
        companyId: companyId,
        data: { profit: totalProfit },
        createdAt: new Date(now)
      });
      needExecuteLogBulk = true;
      // 經理人分紅
      if (companyData.manager !== '!none') {
        const userData = Meteor.users.findOne(companyData.manager, {
          fields: {
            'profile.ban': 1,
            'profile.isInVacation': 1,
            'profile.lastVacationStartDate': 1,
            'status.lastLogin.date': 1
          }
        });
        if (
          // 非當季開始放假者不分紅
          userData.profile && (! userData.profile.isInVacation || now - userData.profile.lastVacationStartDate.getTime() <= Meteor.settings.public.seasonTime) &&
          // 被禁止交易者不分紅
          userData.profile && ! _.contains(userData.profile.ban, 'deal') &&
          // 七天未動作者不分紅
          userData.status && now - userData.status.lastLogin.date.getTime() <= 604800000
        ) {
          const managerProfit = Math.ceil(leftProfit * Meteor.settings.public.managerProfitPercent);
          logBulk.insert({
            logType: '營利分紅',
            userId: [companyData.manager],
            companyId: companyId,
            data: { bonus: managerProfit },
            createdAt: new Date(now + 1)
          });
          usersBulk
            .find({
              _id: companyData.manager
            })
            .updateOne({
              $inc: {
                'profile.money': managerProfit
              }
            });
          needExecuteUserBulk = true;
          leftProfit -= managerProfit;
        }
      }
      // 員工分紅
      const employeeList = [];
      dbEmployees.find({
        companyId: companyId,
        employed: true
      }).forEach((employee) => {
        const userData = Meteor.users.findOne(employee.userId, {
          fields: {
            'profile.ban': 1,
            'profile.isInVacation': 1,
            'profile.lastVacationStartDate': 1,
            'status.lastLogin.date': 1
          }
        });

        if (! userData || ! userData.profile || ! userData.status) {
          return;
        }

        // 非當季開始放假者不分紅
        if (userData.profile.isInVacation && now - userData.profile.lastVacationStartDate.getTime() > Meteor.settings.public.seasonTime) {
          return;
        }

        // 被禁止交易者不分紅
        if (_.contains(userData.profile.ban, 'deal')) {
          return true;
        }

        // 七天未動作者不分紅
        if (now - userData.status.lastLogin.date.getTime() > 604800000) {
          return true;
        }

        employeeList.push(employee.userId);
      });
      if (employeeList.length > 0) {
        const totalBonus = totalProfit * companyData.seasonalBonusPercent * 0.01;
        const bonus = Math.floor(totalBonus / employeeList.length);
        _.each(employeeList, (userId, index) => {
          logBulk.insert({
            logType: '營利分紅',
            userId: [userId],
            companyId: companyId,
            data: { bonus },
            createdAt: new Date(now + 2 + index)
          });
          usersBulk
            .find({
              _id: userId
            })
            .updateOne({
              $inc: {
                'profile.money': bonus
              }
            });
        });
        leftProfit -= bonus * employeeList.length;
        needExecuteUserBulk = true;
      }
      // 剩餘收益先扣去公司營運成本
      leftProfit -= Math.ceil(totalProfit * Meteor.settings.public.costFromProfit);
      const forDirectorProfit = leftProfit;
      // 取得所有能夠領取紅利的董事userId與股份比例
      let canReceiveProfitStocks = 0;
      const canReceiveProfitDirectorList = [];
      dbDirectors
        .find({ companyId }, {
          sort: {
            stocks: -1,
            createdAt: 1
          },
          fields: {
            userId: 1,
            stocks: 1
          }
        })
        .forEach((directorData) => {
          // 系統及金管會不分紅
          if (directorData.userId === '!system' || directorData.userId === '!FSC') {
            return true;
          }
          const userData = Meteor.users.findOne(directorData.userId, {
            fields: {
              'profile.ban': 1,
              'profile.noLoginDayCount': 1,
              'profile.isInVacation': 1,
              'profile.lastVacationStartDate': 1,
              'status.lastLogin.date': 1
            }
          });
          const { _id: userId, profile: userProfile, status: userStatus } = userData;
          if (! userProfile || ! userStatus || ! userStatus.lastLogin || ! userStatus.lastLogin.date) {
            return true;
          }
          const lastLoginDate = userStatus.lastLogin.date;

          const oneDayMs = 86400000;
          const noLoginTime = now - lastLoginDate.getTime();
          const noLoginDay = Math.min(Math.floor(noLoginTime / oneDayMs), 7);
          const noLoginDayCount = Math.min(noLoginDay + (userProfile.noLoginDayCount || 0), Math.floor(Meteor.settings.public.seasonTime / oneDayMs));

          // 非當季開始放假者不分紅
          if (userData.profile.isInVacation && now - userData.profile.lastVacationStartDate.getTime() > Meteor.settings.public.seasonTime) {
            return;
          }

          // 被禁止交易者不分紅
          if (_.contains(userProfile.ban, 'deal')) {
            return true;
          }

          // 七天未動作者不分紅
          if (noLoginTime > 7 * oneDayMs) {
            return true;
          }

          // 未上線天數 >= 5 者，持有股份以 0% 計，故直接排除分紅
          if (noLoginDayCount >= 5) {
            return true;
          }

          // 未上線天數 4 天者，持有股份以 50% 計，其餘則以 100% 計
          const noLoginDayBonusFactor = noLoginDayCount === 4 ? 0.5 : 1;

          // VIP 分紅加成
          const { level: vipLevel = 0 } = dbVips.findOne({ userId, companyId }, { fields: { level: 1 } }) || {};
          const { stockBonusFactor: vipBonusFactor } = Meteor.settings.public.vipParameters[vipLevel];

          // 根據各項加成計算有效持股數
          const effectiveStocksFactor = noLoginDayBonusFactor * vipBonusFactor;
          const effectiveStocks = effectiveStocksFactor * directorData.stocks;

          canReceiveProfitStocks += effectiveStocks;
          canReceiveProfitDirectorList.push({
            userId: directorData.userId,
            stocks: effectiveStocks
          });
        });
      _.each(canReceiveProfitDirectorList, (directorData, index) => {
        const directorProfit = Math.ceil(Math.min(forDirectorProfit * directorData.stocks / canReceiveProfitStocks, leftProfit));
        if (directorProfit > 0) {
          logBulk.insert({
            logType: '營利分紅',
            userId: [directorData.userId],
            companyId: companyId,
            data: { bonus: directorProfit },
            createdAt: new Date(now + 3 + employeeList.length + index)
          });
          usersBulk
            .find({
              _id: directorData.userId
            })
            .updateOne({
              $inc: {
                'profile.money': directorProfit
              }
            });
          needExecuteUserBulk = true;
          leftProfit -= directorProfit;
        }
      });
    });
  if (needExecuteLogBulk) {
    logBulk.execute();
  }
  if (needExecuteUserBulk) {
    usersBulk.execute();
  }
}

// 選舉新的經理人與計算最萌亂鬥大賽所有報名者的攻擊次序
function electManager(seasonData) {
  console.log('start elect manager...');
  debug.log('electManager');
  const lastArenaData = dbArena.findOne({}, {
    sort: {
      beginDate: -1
    },
    fields: {
      _id: 1
    }
  });
  const arenaId = lastArenaData._id;
  const electMessage = (
    `${convertDateToText(seasonData.beginDate)
    }～${
      convertDateToText(seasonData.endDate)}`
  );
  dbSeason.update(seasonData._id, {
    $unset: {
      electTime: ''
    }
  });
  resourceManager.request('electManager', ['elect'], (release) => {
    if (dbCompanies.find({ isSeal: false }).count() > 0) {
      const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
      const companiesBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
      const arenaFightersBulk = dbArenaFighters.rawCollection().initializeUnorderedBulkOp();
      let needExecuteBulk = false;

      dbCompanies
        .find(
          {
            isSeal: false
          },
          {
            fields: {
              _id: 1,
              manager: 1,
              candidateList: 1,
              voteList: 1
            },
            disableOplog: true
          }
        )
        .forEach((companyData) => {
          const companyId = companyData._id;
          switch (companyData.candidateList.length) {
            // 沒有候選人的狀況下，不進行處理
            case 0: {
              return false;
            }
            // 只有一位候選人，只有在原經理與現任經理不同的狀況下才需要處理
            case 1: {
              const newManager = companyData.candidateList[0];
              if (companyData.manager !== newManager) {
                needExecuteBulk = true;
                logBulk.insert({
                  logType: '就任經理',
                  userId: [newManager],
                  companyId: companyId,
                  data: { seasonName: electMessage },
                  createdAt: new Date()
                });
                companiesBulk
                  .find({
                    _id: companyId
                  })
                  .updateOne({
                    $set: {
                      manager: newManager,
                      candidateList: [newManager],
                      voteList: [ [] ]
                    }
                  });
                arenaFightersBulk
                  .find({
                    arenaId: arenaId,
                    companyId: companyId
                  })
                  .updateOne({
                    $set: {
                      manager: newManager
                    }
                  });
              }
              break;
            }
            // 多位候選人的狀況下
            default: {
              needExecuteBulk = true;
              const voteList = companyData.voteList;
              const directorList = dbDirectors
                .find({ companyId }, {
                  fields: {
                    userId: 1,
                    stocks: 1
                  },
                  disableOplog: true
                })
                .fetch();

              const voteStocksList = _.map(companyData.candidateList, (candidate, index) => {
                const voteDirectorList = voteList[index];
                const stocks = _.reduce(voteDirectorList, (stocks, userId) => {
                  const directorData = _.findWhere(directorList, { userId });

                  return stocks + (directorData ? directorData.stocks : 0);
                }, 0);

                return {
                  userId: candidate,
                  stocks: stocks
                };
              });
              const sortedVoteStocksList = _.sortBy(voteStocksList, 'stocks');
              const winnerStocks = _.last(sortedVoteStocksList).stocks;
              const winnerData = _.findWhere(voteStocksList, {
                stocks: winnerStocks
              });
              logBulk.insert({
                logType: '就任經理',
                userId: [winnerData.userId, companyData.manager],
                companyId: companyId,
                data: {
                  seasonName: electMessage,
                  stocks: winnerData.stocks
                },
                createdAt: new Date()
              });
              companiesBulk
                .find({
                  _id: companyId
                })
                .updateOne({
                  $set: {
                    manager: winnerData.userId,
                    candidateList: [winnerData.userId],
                    voteList: [ [] ]
                  }
                });
              arenaFightersBulk
                .find({
                  arenaId: arenaId,
                  companyId: companyId
                })
                .updateOne({
                  $set: {
                    manager: winnerData.userId
                  }
                });
              break;
            }
          }
        });

      release();

      if (needExecuteBulk) {
        logBulk.execute();
        companiesBulk.execute();
        arenaFightersBulk.execute();
      }
    }
  });

  // 若本商業季度為最萌亂鬥大賽的舉辦季度，則計算出所有報名者的攻擊次序
  const arenaCounter = dbVariables.get('arenaCounter') || 0;
  if (arenaCounter <= 0) {
    if (lastArenaData) {
      const fighterCompanyIdList = dbArenaFighters
        .find({ arenaId }, {
          fields: {
            companyId: 1
          }
        })
        .map((arenaFighter) => {
          return arenaFighter.companyId;
        });
      const shuffledFighterCompanyIdList = _.shuffle(fighterCompanyIdList);
      dbArena.update(arenaId, {
        $set: {
          shuffledFighterCompanyIdList
        }
      });
      const attackSequence = _.range(shuffledFighterCompanyIdList.length);
      dbArenaFighters
        .find({}, {
          fields: {
            _id: 1,
            companyId: 1
          }
        })
        .forEach((fighter) => {
          const thisFighterIndex = _.indexOf(shuffledFighterCompanyIdList, fighter.companyId);
          const thisAttackSequence = _.without(attackSequence, thisFighterIndex);
          const shuffledAttackSequence = _.shuffle(thisAttackSequence);
          dbArenaFighters.update(fighter._id, {
            $set: {
              attackSequence: shuffledAttackSequence
            }
          });
        });
    }
  }
}
function convertDateToText(date) {
  const dateInTimeZone = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000 * -1);

  return (
    `${dateInTimeZone.getFullYear()}/${
      padZero(dateInTimeZone.getMonth() + 1)}/${
      padZero(dateInTimeZone.getDate())} ${
      padZero(dateInTimeZone.getHours())}:${
      padZero(dateInTimeZone.getMinutes())}`
  );
}
function padZero(n) {
  if (n < 10) {
    return `0${n}`;
  }
  else {
    return n;
  }
}
