'use strict';
import { Meteor } from 'meteor/meteor';
import { config } from '../config';
import { dbConfig } from '../db/dbConfig';

if (! dbConfig.findOne()) {
  dbConfig.insert({
    validateUserUrl: 'https://www.ptt.cc/bbs/C_Chat/M.1500602797.A.256.html',
    validateUserBoardName: 'C_Chat',
    validateUserAID: '#1PSM6j9M',
    currentSeasonStartDate: new Date(),
    currentSeasonEndDate: new Date(Date.now() + config.seasonTime)
  });
}

Meteor.publish('dbConfig', function () {
  return dbConfig.find();
});
