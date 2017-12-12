import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { createOrder } from '/server/imports/createOrder';
import { resourceManager } from '/server/imports/threading/resourceManager';
import { countdownManager } from '/server/imports/utils/countdownManager';
import { dbCompanies } from '/db/dbCompanies';
import { dbOrders } from '/db/dbOrders';
import { dbVariables } from '/db/dbVariables';
import { debug } from '/server/imports/utils/debug';
import { getPriceLimits } from './helpers';

const counterBase = 1000 * 60;

// 產生新的高價釋股倒數值
function generateReleaseStocksForHighPriceCounter() {
  return _.random(Meteor.settings.public.releaseStocksForHighPriceMinCounter, Meteor.settings.public.releaseStocksForHighPriceMaxCounter);
}

// 記錄高價釋股時間
function updateReleaseStocksForHighPricePeriod() {
  const now = Date.now();
  const begin = now + Meteor.settings.public.releaseStocksForHighPriceMinCounter * counterBase;
  const end = now + Meteor.settings.public.releaseStocksForHighPriceMaxCounter * counterBase;

  dbVariables.set('releaseStocksForHighPriceBegin', begin);
  dbVariables.set('releaseStocksForHighPriceEnd', end);
}

// 倒數高價釋股
export function countDownReleaseStocksForHighPrice() {
  debug.log('countDownReleaseStocksForHighPrice');

  const counterKey = 'releaseStocksForHighPriceCounter';

  if (! countdownManager.isInitialized(counterKey)) {
    countdownManager.set(counterKey, generateReleaseStocksForHighPriceCounter());
  }

  countdownManager.countDown(counterKey);

  if (! countdownManager.isZeroReached(counterKey)) {
    return;
  }

  const nextCounter = generateReleaseStocksForHighPriceCounter();
  countdownManager.set(counterKey, nextCounter);
  console.info('releaseStocksForHighPrice triggered! next counter: ', nextCounter);

  // 更新下次可能觸發時間區間
  updateReleaseStocksForHighPricePeriod();

  releaseStocksForHighPrice();
}

// 對全市場進行高價釋股
export function releaseStocksForHighPrice() {
  const highPriceCompanyCount = dbVariables.get('highPriceCompanyCount');

  // 無高價公司則不進行釋股
  if (highPriceCompanyCount <= 0) {
    return;
  }

  dbCompanies
    .find({ isSeal: false }, {
      sort: { lastPrice: -1 },
      fields: { _id: 1 },
      limit: highPriceCompanyCount,
      disableOplog: true
    })
    .forEach(({ _id: companyId }) => {
      // 先鎖定資源，再重新讀取一次資料進行運算
      resourceManager.request('releaseStocksForHighPrice', [`companyOrder${companyId}`], (release) => {
        const companyData = dbCompanies.findOne(companyId, {
          fields: {
            _id: 1,
            listPrice: 1,
            totalRelease: 1
          }
        });

        const { totalRelease } = companyData;

        // 有尚存在的任何釋股單在市場上時不會繼續釋股
        if (dbOrders.find({ companyId, userId: '!system' }).count() > 0) {
          release();

          return;
        }

        const releasePrice = getPriceLimits(companyData).upper;
        const maxReleaseStocks = Math.floor(Math.sqrt(totalRelease));
        const releaseStocks = 1 + Math.floor(Math.random() * maxReleaseStocks);

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
