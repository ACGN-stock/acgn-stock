import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { countdownManager } from '/server/imports/utils/countdownManager';
import { dbCompanies } from '/db/dbCompanies';
import { dbVariables } from '/db/dbVariables';
import { debug } from '/server/imports/utils/debug';
import { replenishProducts } from '../product/replenishProducts';
import { sellFscStocks } from './sellFscStocks';

const counterBase = 1000 * 60;

function generateRecordListPriceCounter() {
  return _.random(
    Meteor.settings.public.recordListPriceMinCounter,
    Meteor.settings.public.recordListPriceMaxCounter
  );
}

function updateRecordListPricePeriod() {
  const now = Date.now();
  const begin = now + Meteor.settings.public.recordListPriceMinCounter * counterBase;
  const end = now + Meteor.settings.public.recordListPriceMaxCounter * counterBase;

  dbVariables.set('recordListPriceBegin', begin);
  dbVariables.set('recordListPriceEnd', end);
}

// 倒數更新參考價
export function countDownRecordListPrice() {
  debug.log('countDownRecordListPrice');

  const counterKey = 'recordListPriceCounter';

  if (! countdownManager.isInitialized(counterKey)) {
    countdownManager.set(counterKey, generateRecordListPriceCounter());
  }

  countdownManager.countDown(counterKey);

  if (! countdownManager.isZeroReached(counterKey)) {
    return;
  }

  const nextCounter = generateRecordListPriceCounter();
  countdownManager.set(counterKey, nextCounter);
  console.info('recordListPrice triggered! next counter: ', nextCounter);

  // 更新下次可能觸發時間區間
  updateRecordListPricePeriod();

  recordListPrice();
  sellFscStocks(); // 參考價更新同時賣出金管會持股
  replenishProducts(); // 參考價更新同時補貨
}

// 更新參考價（與參考市值）
export function recordListPrice() {
  dbCompanies
    .find({ isSeal: false }, {
      fields: {
        _id: 1,
        lastPrice: 1,
        listPrice: 1
      },
      disableOplog: true
    })
    .forEach(({ _id: companyId }) => {
      //先鎖定資源，再重新讀取一次資料進行運算
      resourceManager.request('recordListPrice', [`companyOrder${companyId}`], (release) => {
        const { lastPrice, listPrice, totalRelease } = dbCompanies.findOne(companyId, {
          fields: {
            lastPrice: 1,
            listPrice: 1,
            totalRelease: 1
          }
        });

        if (lastPrice === listPrice) {
          release();

          return;
        }

        dbCompanies.update(companyId, {
          $set: {
            listPrice: lastPrice,
            totalValue: lastPrice * totalRelease
          }
        });

        release();
      });
    });
}
