import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { eventScheduler } from '/server/imports/utils/eventScheduler';
import { checkChairman } from '/server/functions/company/checkChairman';
import { recordListPrice, updateRecordListPricePeriod } from '/server/functions/company/recordListPrice';
import { sellFscStocks } from '/server/functions/company/sellFscStocks';
import { electManager } from '/server/functions/company/electManager';
import { releaseStocksForHighPrice, updateReleaseStocksForHighPricePeriod } from '/server/functions/company/releaseStocksForHighPrice';
import { releaseStocksForNoDeal, updateReleaseStocksForNoDealPeriod } from '/server/functions/company/releaseStocksForNoDeal';
import { releaseStocksForLowPrice, updateReleaseStocksForLowPricePeriod } from '/server/functions/company/releaseStocksForLowPrice';
import { initializeAttackSequences } from '/server/functions/arena/initializeAttackSequences';
import { paySalaryAndCheckTax } from '../paySalaryAndCheckTax';

Meteor.startup(() => {
  // 董事長檢查
  eventScheduler.defineRecurringEvent('company.checkChairman', {
    onTriggered() {
      checkChairman();
    },
    nextScheduledAt() {
      // TODO 移除 counter 設定，改用時間計算
      const { checkChairmanCounter, intervalTimer } = Meteor.settings.public;

      return Date.now() + checkChairmanCounter * intervalTimer;
    }
  });

  // 參考價更新
  eventScheduler.defineRecurringEvent('company.recordListPrice', {
    onTriggered() {
      updateRecordListPricePeriod();
      recordListPrice();
      sellFscStocks(); // 參考價更新同時賣出金管會持股
    },
    nextScheduledAt() {
      // TODO 移除 counter 設定，改用時間計算
      const { recordListPriceMinCounter, recordListPriceMaxCounter, intervalTimer } = Meteor.settings.public;
      const randomCounter = _.random(recordListPriceMinCounter, recordListPriceMaxCounter);

      return Date.now() + randomCounter * intervalTimer;
    }
  });

  // 高價釋股
  eventScheduler.defineRecurringEvent('company.releaseStocksForHighPrice', {
    onTriggered() {
      updateReleaseStocksForHighPricePeriod();
      releaseStocksForHighPrice();
    },
    nextScheduledAt() {
      // TODO 移除 counter 設定，改用時間計算
      const { releaseStocksForHighPriceMinCounter, releaseStocksForHighPriceMaxCounter, intervalTimer } = Meteor.settings.public;
      const randomCounter = _.random(releaseStocksForHighPriceMinCounter, releaseStocksForHighPriceMaxCounter);

      return Date.now() + randomCounter * intervalTimer;
    }
  });

  // 低量釋股
  eventScheduler.defineRecurringEvent('company.releaseStocksForNoDeal', {
    onTriggered() {
      updateReleaseStocksForNoDealPeriod();
      releaseStocksForNoDeal();
    },
    nextScheduledAt() {
      // TODO 移除 counter 設定，改用時間計算
      const { releaseStocksForNoDealMinCounter, releaseStocksForNoDealMaxCounter, intervalTimer } = Meteor.settings.public;
      const randomCounter = _.random(releaseStocksForNoDealMinCounter, releaseStocksForNoDealMaxCounter);

      return Date.now() + randomCounter * intervalTimer;
    }
  });

  // 低價釋股
  eventScheduler.defineRecurringEvent('company.releaseStocksForLowPrice', {
    onTriggered() {
      updateReleaseStocksForLowPricePeriod();
      releaseStocksForLowPrice();
    },
    nextScheduledAt() {
      // TODO 移除 counter 設定，改用時間計算
      const { releaseStocksForLowPriceCounter, intervalTimer } = Meteor.settings.public;

      return Date.now() + releaseStocksForLowPriceCounter * intervalTimer;
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

  // 亂鬥報名截止
  eventScheduler.setEventCallback('arena.joinEnded', () => {
    console.log('event triggered: arena.joinEnded');
    initializeAttackSequences();
  });
});
