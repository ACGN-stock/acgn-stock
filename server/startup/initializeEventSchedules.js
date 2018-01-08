import { Meteor } from 'meteor/meteor';

import { replenishProducts } from '/server/functions/product/replenishProducts';
import { eventScheduler } from '/server/imports/utils/eventScheduler';

Meteor.startup(() => {
  // 產品最後出清
  eventScheduler.setEventCallback('product.finalSale', () => {
    console.log('event triggered: product.finalSale');
    replenishProducts({ finalSale: true });
  });
});
