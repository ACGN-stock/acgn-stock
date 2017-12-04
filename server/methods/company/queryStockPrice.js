import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbPrice } from '/db/dbPrice';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  queryStocksPrice(companyId) {
    check(companyId, String);

    return queryStocksPrice(companyId);
  }
});
function queryStocksPrice(companyId) {
  debug.log('queryStocksPrice', companyId);

  return dbPrice
    .find(
      {
        companyId: companyId,
        createdAt: {
          $gt: new Date(Date.now() - 86400000)
        }
      },
      {
        fields: {
          createdAt: 1,
          price: 1
        }
      }
    )
    .map((priceData) => {
      return {
        x: priceData.createdAt.getTime(),
        y: priceData.price
      };
    });
}
//一分鐘最多10次
limitMethod('queryStocksPrice');
