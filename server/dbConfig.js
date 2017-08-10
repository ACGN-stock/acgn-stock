'use strict';
import { dbVariables } from '../db/dbVariables';

if (! dbVariables.initialized()) {
  dbVariables.set('validateUserUrl', 'https://www.ptt.cc/bbs/C_Chat/M.1501484745.A.B15.html');
  dbVariables.set('validateUserBoardName', 'C_Chat');
  dbVariables.set('validateUserAID', '#1PVjR9iL');
}
