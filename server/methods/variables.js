'use strict';
import { Meteor } from 'meteor/meteor';
import { dbVariables } from '../../db/dbVariables';

Meteor.publish('variables', function () {
  return dbVariables.find(
    {
      _id: {
        $nin: [
          'lastPayTime',
          'releaseStocksForHighPriceCounter',
          'releaseStocksForNoDealCounter',
          'recordListPriceConter'
        ]
      }
    },
    {
      disableOplog: true
    }
  );
});
