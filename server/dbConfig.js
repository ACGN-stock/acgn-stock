'use strict';
import { config } from '../config';
import { dbConfig } from '../db/dbConfig';

if (! dbConfig.findOne()) {
  dbConfig.insert({
    validateUserUrl: 'https://www.ptt.cc/bbs/C_Chat/M.1501484745.A.B15.html',
    validateUserBoardName: 'C_Chat',
    validateUserAID: '#1PVjR9iL',
    currentSeasonStartDate: new Date(),
    currentSeasonEndDate: new Date(Date.now() + config.seasonTime)
  });
}
