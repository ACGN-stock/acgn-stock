import { _ } from 'meteor/underscore';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbPrice } from '/db/dbPrice';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  queryStocksCandlestick(companyId, options) {
    check(companyId, String);
    check(options, {
      lastTime: Number,
      unitTime: Number,
      count: Number
    });

    return queryStocksCandlestick(companyId, options);
  }
});
function queryStocksCandlestick(companyId, options) {
  debug.log('queryStocksCandlestick', { companyId, options });
  const list = dbPrice
    .find(
      {
        companyId: companyId,
        createdAt: {
          $gt: new Date(options.lastTime - options.unitTime * options.count)
        }
      },
      {
        fields: {
          createdAt: 1,
          price: 1
        },
        disableOplog: true
      }
    )
    .fetch();
  const candlestickList = _.map(_.range(options.count), function(index) {
    const startTime = options.lastTime - options.unitTime * (options.count - index);
    const priceList = _.filter(list, function(order) {
      return startTime <= order.createdAt && order.createdAt < startTime + options.unitTime;
    });

    return {
      time: startTime,
      open: _.min(priceList, function(order) {
        return order.createdAt;
      }).price || 0,
      close: _.max(priceList, function(order) {
        return order.createdAt;
      }).price || 0,
      high: _.max(priceList, function(order) {
        return order.price;
      }).price || 0,
      low: _.min(priceList, function(order) {
        return order.price;
      }).price || 0
    };
  });

  return _.filter(candlestickList, function(candlestick) {
    return candlestick.open > 0;
  });
}
// 一分鐘最多20次
limitMethod('queryStocksCandlestick');
