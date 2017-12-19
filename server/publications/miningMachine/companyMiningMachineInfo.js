import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbCompanyStones } from '/db/dbCompanyStones';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

const scope = 'miningMachineInfo';

Meteor.publish('companyMiningMachineInfo', function(companyId) {
  debug.log('publish companyMiningMachineInfo', companyId);

  check(companyId, String);

  const companyStonesCursor = dbCompanyStones.find({ companyId }, { fields: { stoneType: 1 } });

  const stoneCountMap = {};
  this.added('companies', companyId, { [`${scope}.stoneCount`]: {} });

  const increaseStoneCount = (stoneType, increment) => {
    stoneCountMap[stoneType] = (stoneCountMap[stoneType] || 0) + increment;
    this.changed('companies', companyId, { [`${scope}.stoneCount.${stoneType}`]: stoneCountMap[stoneType] });
  };

  const stoneCountObserver = companyStonesCursor.observe({
    added: ({ stoneType }) => {
      increaseStoneCount(stoneType, 1);
    },
    changed: ({ stoneType: newStoneType }, { stoneType: oldStoneType }) => {
      increaseStoneCount(newStoneType, 1);
      increaseStoneCount(oldStoneType, -1);
    },
    removed: ({ stoneType }) => {
      increaseStoneCount(stoneType, -1);
    }
  });

  this.ready();

  this.onStop(() => {
    stoneCountObserver.stop();
  });
});

limitSubscription('companyMiningMachineInfo');
