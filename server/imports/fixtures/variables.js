import { dbVariables } from '/db/dbVariables';
import { updateFoundationVariables } from '/server/functions/foundation/updateFoundationVariables';

dbVariables.setIfNotFound('validateUserUrl', 'https://www.ptt.cc/bbs/ACGN_stock/M.1508993391.A.381.html');
dbVariables.setIfNotFound('validateUserBoardName', 'ACGN_stock');
dbVariables.setIfNotFound('validateUserAID', '#1PyMblE1');

// 初始化新創相關變數
if (! dbVariables.has('foundation.minInvestorCount') || ! dbVariables.has('foundation.minAmountPerInvestor')) {
  updateFoundationVariables();
}
