import { Meteor } from 'meteor/meteor';

import { replenishProducts } from '/server/functions/product/replenishProducts';
import { checkVipLevels } from '/server/functions/vip/checkVipLevels';
import { eventScheduler } from '/server/imports/utils/eventScheduler';

Meteor.startup(() => {
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
});
