import { Meteor } from 'meteor/meteor';
import { dbVariables } from '/db/dbVariables';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('variables', function() {
  debug.log('publish variables');

  return dbVariables.find(
    {
      _id: {
        $in: [
          'announcement',
          'validateUserUrl',
          'validateUserBoardName',
          'validateUserAID',
          'lowPriceThreshold',
          'highPriceThreshold',
          'recordListPriceBegin',
          'recordListPriceEnd',
          'releaseStocksForHighPriceBegin',
          'releaseStocksForHighPriceEnd',
          'releaseStocksForNoDealBegin',
          'releaseStocksForNoDealEnd',
          'arenaCounter',
          'fscRuleURL',
          'foundation.minInvestorCount',
          'foundation.minAmountPerInvestor'
        ]
      }
    },
    {
      disableOplog: true
    }
  );
});
// 一分鐘最多重複訂閱5次
limitSubscription('variables', 5);
