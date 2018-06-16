import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { checkChairman } from '/server/functions/company/checkChairman';
import { recordListPrice, updateRecordListPricePeriod } from '/server/functions/company/recordListPrice';
import { releaseStocksForHighPrice, updateReleaseStocksForHighPricePeriod } from '/server/functions/company/releaseStocksForHighPrice';
import { releaseStocksForNoDeal, updateReleaseStocksForNoDealPeriod } from '/server/functions/company/releaseStocksForNoDeal';
import { sellFscStocks } from '/server/functions/company/sellFscStocks';
import { electManager } from '/server/functions/company/electManager';
import { replenishProducts } from '/server/functions/product/replenishProducts';
import { checkVipLevels } from '/server/functions/vip/checkVipLevels';
import { computeArenaAttackSequences } from '/server/functions/arena/computeArenaAttackSequences';
import { eventScheduler } from '/server/imports/utils/eventScheduler';
import { executeZeroVolumePriceDrop } from '/server/functions/company/executeZeroVolumePriceDrop';
import { paySalaryAndCheckTax } from '../paySalaryAndCheckTax';

Meteor.startup(() => {
  // 董事長檢查
  eventScheduler.defineRecurringEvent('company.checkChairman', {
    onTriggered() {
      checkChairman();
    },
    nextScheduledAt() {
      return Date.now() + Meteor.settings.public.checkChairmanInterval;
    }
  });

  // 參考價更新
  eventScheduler.defineRecurringEvent('company.recordListPrice', {
    onTriggered() {
      updateRecordListPricePeriod();
      (async() => {
        await executeZeroVolumePriceDrop(); // 判定無量跌停
        await recordListPrice(); // 更新參考價
        await sellFscStocks(); // 賣出金管會持股
      })();
      replenishProducts(); // 參考價更新同時補貨
    },
    nextScheduledAt() {
      const { min: intervalMin, max: intervalMax } = Meteor.settings.public.recordListPriceInterval;

      return Date.now() + _.random(intervalMin, intervalMax);
    }
  });

  // 高價釋股
  eventScheduler.defineRecurringEvent('company.releaseStocksForHighPrice', {
    onTriggered() {
      updateReleaseStocksForHighPricePeriod();
      releaseStocksForHighPrice();
    },
    nextScheduledAt() {
      const { min: intervalMin, max: intervalMax } = Meteor.settings.public.releaseStocksForHighPriceInterval;

      return Date.now() + _.random(intervalMin, intervalMax);
    }
  });

  // 低量釋股
  eventScheduler.defineRecurringEvent('company.releaseStocksForNoDeal', {
    onTriggered() {
      updateReleaseStocksForNoDealPeriod();
      releaseStocksForNoDeal();
    },
    nextScheduledAt() {
      const { min: intervalMin, max: intervalMax } = Meteor.settings.public.releaseStocksForNoDealInterval;

      return Date.now() + _.random(intervalMin, intervalMax);
    }
  });

  // 每日全域事件
  eventScheduler.defineRecurringEvent('global.daily', {
    onTriggered() {
      console.log('event triggered: global.daily');
      paySalaryAndCheckTax();
    },
    nextScheduledAt() {
      // 下一天的 00:00 UTC（台灣時間早上八點）
      return new Date(Date.now() + 24 * 60 * 60 * 1000).setUTCHours(0, 0, 0, 0);
    }
  });

  // 季度經理人選舉
  eventScheduler.setEventCallback('season.electManager', () => {
    console.log('event triggered: season.electManager');
    electManager();
  });

  // 產品最後出清
  eventScheduler.setEventCallback('product.finalSale', () => {
    console.log('event triggered: product.finalSale');
    replenishProducts({ finalSale: true });
  });

  // 定期更新 VIP 等級
  eventScheduler.defineRecurringEvent('vip.checkVipLevels', {
    onTriggered() {
      checkVipLevels();
    },
    nextScheduledAt() {
      return Date.now() + Meteor.settings.public.vipLevelCheckInterval;
    }
  });

  // 亂鬥報名封關
  eventScheduler.setEventCallback('arena.joinEnded', () => {
    console.log('event triggered: arena.joinEnded');
    computeArenaAttackSequences();
  });
});
