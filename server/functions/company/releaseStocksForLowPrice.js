import { Meteor } from 'meteor/meteor';

import { createOrder } from '/server/imports/createOrder';
import { resourceManager } from '/server/imports/threading/resourceManager';
import { countdownManager } from '/server/imports/utils/countdownManager';
import { dbCompanies } from '/db/dbCompanies';
import { dbVariables } from '/db/dbVariables';
import { debug } from '/server/imports/utils/debug';
import { calculateHighPriceBuyAmount, getPriceLimits } from './helpers';

const counterBase = 1000 * 60;

function generateReleaseStocksForLowPriceCounter() {
  return Meteor.settings.public.releaseStocksForLowPriceCounter;
}

function updateReleaseStocksForLowPricePeriod() {
  const jitter = 30;
  const now = Date.now();
  const begin = now + (Meteor.settings.public.releaseStocksForLowPriceCounter - jitter) * counterBase;
  const end = now + (Meteor.settings.public.releaseStocksForLowPriceCounter + jitter) * counterBase;

  dbVariables.set('releaseStocksForLowPriceBegin', begin);
  dbVariables.set('releaseStocksForLowPriceEnd', end);
}

export function countDownReleaseStocksForLowPrice() {
  debug.log('countDownReleaseStocksForLowPrice');

  const counterKey = 'releaseStocksForLowPriceCounter';

  if (! countdownManager.isInitialized(counterKey)) {
    countdownManager.set(counterKey, generateReleaseStocksForLowPriceCounter());
  }

  countdownManager.countDown(counterKey);

  if (! countdownManager.isZeroReached(counterKey)) {
    return;
  }

  const nextCounter = generateReleaseStocksForLowPriceCounter();
  countdownManager.set(counterKey, nextCounter);
  console.info('releaseStocksForLowPrice triggered! next counter: ', nextCounter);

  // 更新下次可能觸發時間區間
  updateReleaseStocksForLowPricePeriod();

  releaseStocksForLowPrice();
}

// 對全市場進行低價釋股
export function releaseStocksForLowPrice() {
  const lowPriceThreshold = dbVariables.get('lowPriceThreshold');

  dbCompanies
    .find({
      isSeal: false,
      listPrice: { $lt: lowPriceThreshold }
    }, {
      fields: { _id: 1 },
      disableOplog: true
    })
    .forEach(({ _id: companyId }) => {
      //先鎖定資源，再重新讀取一次資料進行運算
      resourceManager.request('releaseStocksForLowPrice', [`companyOrder${companyId}`], (release) => {
        const companyData = dbCompanies.findOne(companyId, {
          fields: {
            listPrice: 1,
            totalRelease: 1
          }
        });

        const { totalRelease } = companyData;

        const highPriceBuyAmount = calculateHighPriceBuyAmount(companyData);
        const minReleaseAmount = Math.floor(totalRelease * 0.01);
        const maxReleaseAmount = Math.floor(totalRelease * 0.05);

        // 買單數量未超過最低釋股數 (1% 總股數)，則不進行釋股
        if (highPriceBuyAmount <= minReleaseAmount) {
          release();

          return;
        }

        const releasePrice = getPriceLimits(companyData).upper;
        const releaseStocks = Math.min(highPriceBuyAmount, maxReleaseAmount);

        createOrder({
          userId: '!system',
          companyId: companyId,
          orderType: '賣出',
          unitPrice: releasePrice,
          amount: releaseStocks
        });

        release();
      });
    });
}
