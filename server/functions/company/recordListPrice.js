import { Meteor } from 'meteor/meteor';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbCompanies } from '/db/dbCompanies';
import { dbVariables } from '/db/dbVariables';

export function updateRecordListPricePeriod() {
  const { min: intervalMin, max: intervalMax } = Meteor.settings.public.recordListPriceInterval;
  const now = Date.now();

  dbVariables.set('recordListPriceBegin', now + intervalMin);
  dbVariables.set('recordListPriceEnd', now + intervalMax);
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
      // 先鎖定資源，再重新讀取一次資料進行運算
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
