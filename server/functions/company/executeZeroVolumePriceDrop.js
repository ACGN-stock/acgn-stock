import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';

import { dbCompanies, getPriceLimits } from '/db/dbCompanies';
import { dbOrders } from '/db/dbOrders';
import { calculateDealAmount } from '/server/functions/company/helpers';
import { resourceManager } from '/server/imports/threading/resourceManager';

export function executeZeroVolumePriceDrop() {
  const { orderAgeThreshold, tradeVolumeLookbackTime } = Meteor.settings.public.zeroVolumePriceDrop;

  return resourceManager.requestPromise('executeZeroVolumePriceDrop', ['allCompanyOrders'], (release) => {
    const companyUpdateModifierMap = dbOrders.aggregate([ {
      $match: {
        orderType: '賣出',
        createdAt: { $lt: new Date(Date.now() - orderAgeThreshold) }
      }
    }, {
      $group: {
        _id: '$companyId',
        minSellOrderPrice: { $min: '$unitPrice' }
      }
    }, {
      $lookup: {
        from: 'companies',
        localField: '_id',
        foreignField: '_id',
        as: 'companyData'
      }
    }, {
      $unwind: '$companyData'
    }, {
      $match: { 'companyData.isSeal': false }
    } ])
      .reduce((obj, { _id: companyId, companyData, minSellOrderPrice }) => {
        const tradeVolume = calculateDealAmount(companyData, tradeVolumeLookbackTime);
        const { lower: lowerPriceLimit } = getPriceLimits(companyData);

        if (tradeVolume === 0 && minSellOrderPrice <= lowerPriceLimit) {
          obj[companyId] = { $set: { lastPrice: minSellOrderPrice } };
        }

        return obj;
      }, {});

    if (! _.isEmpty(companyUpdateModifierMap)) {
      const companyBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
      Object.entries(companyUpdateModifierMap).forEach(([companyId, modifier]) => {
        companyBulk.find({ _id: companyId }).updateOne(modifier);
      });
      Meteor.wrapAsync(companyBulk.execute, companyBulk)();
    }

    release();
  });
}
