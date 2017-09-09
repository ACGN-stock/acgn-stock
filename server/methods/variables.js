'use strict';
import { Meteor } from 'meteor/meteor';
import { dbVariables } from '../../db/dbVariables';

Meteor.publish('variables', function () {
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
