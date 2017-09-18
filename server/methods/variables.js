'use strict';
import { Meteor } from 'meteor/meteor';
import { dbVariables } from '../../db/dbVariables';
import { limitSubscription } from './rateLimit';
import { debug } from '../debug';

Meteor.publish('variables', function () {
  debug.log('publish variables');

  return dbVariables.find(
    {
      _id: {
        $in: [
          'announcement',
          'validateUserUrl',
          'validateUserBoardName',
          'validateUserAID',
          'lowPriceThreshold'
        ]
      }
    },
    {
      disableOplog: true
    }
  );
});
//一分鐘最多重複訂閱5次
limitSubscription('variables', 5);
