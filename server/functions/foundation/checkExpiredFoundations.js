import { Meteor } from 'meteor/meteor';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbVariables } from '/db/dbVariables';
import { dbFoundations } from '/db/dbFoundations';
import { debug } from '/server/imports/utils/debug';

import { doOnFoundationSuccess } from './doOnFoundationSuccess';
import { doOnFoundationFailure } from './doOnFoundationFailure';

const { foundExpireTime } = Meteor.settings.public;

// 檢查所有已截止的新創公司
export function checkExpiredFoundations() {
  debug.log('checkExpiredFoundations');

  const expiredFoundationCreatedAt = new Date(Date.now() - foundExpireTime);
  const minInvestorCount = dbVariables.get('foundation.minInvestorCount');

  dbFoundations
    .find({
      createdAt: { $lt: expiredFoundationCreatedAt }
    }, {
      fields: { _id: 1 },
      disableOplog: true
    })
    .forEach(({ _id: companyId }) => {
      // 先鎖定資源，再重新讀取一次資料進行運算
      resourceManager.request('checkExpiredFoundations', [`foundation${companyId}`], (release) => {
        const foundationData = dbFoundations.findOne(companyId);
        if (! foundationData) {
          release();

          return;
        }

        if (foundationData.invest.length >= minInvestorCount) {
          doOnFoundationSuccess(foundationData);
        }
        else {
          doOnFoundationFailure(foundationData);
        }

        release();
      });
    });
}
