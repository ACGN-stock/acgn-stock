import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { createOrder } from '/server/imports/createOrder';
import { resourceManager } from '/server/imports/threading/resourceManager';
import { countdownManager } from '/server/imports/utils/countdownManager';
import { dbCompanies } from '/db/dbCompanies';
import { dbVariables } from '/db/dbVariables';
import { debug } from '/server/imports/utils/debug';
import { calculateHighPriceBuyAmount, calculateDealAmount, getPriceLimits } from './helpers';

const counterBase = 1000 * 60;

function generateReleaseStocksForNoDealCounter() {
  return _.random(
    Meteor.settings.public.releaseStocksForNoDealMinCounter,
    Meteor.settings.public.releaseStocksForNoDealMaxCounter
  );
}

function updateReleaseStocksForNoDealPeriod() {
  const now = Date.now();
  const begin = now + Meteor.settings.public.releaseStocksForNoDealMinCounter * counterBase;
  const end = now + Meteor.settings.public.releaseStocksForNoDealMaxCounter * counterBase;

  dbVariables.set('releaseStocksForNoDealBegin', begin);
  dbVariables.set('releaseStocksForNoDealEnd', end);
}

// 倒數低量釋股
export function countDownReleaseStocksForNoDeal() {
  debug.log('countDownReleaseStocksForNoDeal');

  const counterKey = 'releaseStocksForNoDealCounter';

  if (! countdownManager.isInitialized(counterKey)) {
    countdownManager.set(counterKey, generateReleaseStocksForNoDealCounter());
  }

  countdownManager.countDown(counterKey);

  if (! countdownManager.isZeroReached(counterKey)) {
    return;
  }

  const nextCounter = generateReleaseStocksForNoDealCounter();
  countdownManager.set(counterKey, nextCounter);
  console.info('releaseStocksForNoDeal triggered! next counter: ', nextCounter);

  // 更新下次可能觸發時間區間
  updateReleaseStocksForNoDealPeriod();

  releaseStocksForNoDeal();
}

// 對全市場進行低量釋股
export function releaseStocksForNoDeal() {
  dbCompanies
    .find({ isSeal: false }, {
      fields: { _id: 1 },
      disableOplog: true
    })
    .forEach(({ _id: companyId }) => {
      // 先鎖定資源，再重新讀取一次資料進行運算
      resourceManager.request('releaseStocksForNoDeal', [`companyOrder${companyId}`], (release) => {
        const companyData = dbCompanies.findOne(companyId, { fields: { _id: 1, listPrice: 1 } });
        const dealAmount = calculateDealAmount(companyData, Meteor.settings.public.releaseStocksForNoDealTradeLogLookbackIntervalTime);
        const highPriceBuyAmount = calculateHighPriceBuyAmount(companyData);

        if (highPriceBuyAmount <= dealAmount * 10) {
          release();

          return;
        }

        const releasePrice = getPriceLimits(companyData).upper;
        const releaseStocks = 1 + Math.floor(Math.random() * highPriceBuyAmount / 2);

        createOrder({
          userId: '!system',
          companyId,
          orderType: '賣出',
          unitPrice: releasePrice,
          amount: releaseStocks
        });
        release();
      });
    });
}
