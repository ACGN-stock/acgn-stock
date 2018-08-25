import { dbVariables } from '/db/dbVariables';
import { updateFoundationVariables } from '/server/functions/foundation/updateFoundationVariables';

dbVariables.setIfNotFound('validateUserUrl', 'https://www.ptt.cc/bbs/C_Chat/M.1501484745.A.B15.html');
dbVariables.setIfNotFound('validateUserBoardName', 'C_Chat');
dbVariables.setIfNotFound('validateUserAID', '#1PVjR9iL');

// 初始化新創相關變數
if (! dbVariables.has('foundation.minInvestorCount') || ! dbVariables.has('foundation.minAmountPerInvestor')) {
  updateFoundationVariables();
}
