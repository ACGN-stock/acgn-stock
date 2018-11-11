import { dbVariables } from '/db/dbVariables';
import { computeActiveUserCount } from '/server/imports/utils/computeActiveUserCount';

export function updateFoundationVariables() {
  const activeUserCount = computeActiveUserCount();

  const minInvestorCount = Math.max(5, Math.floor(0.7 * Math.sqrt(activeUserCount) / 5) * 5);
  const minAmountPerInvestor = Math.max(1, Math.ceil(1000 / minInvestorCount / 10) * 10);

  dbVariables.set('foundation.minInvestorCount', minInvestorCount);
  dbVariables.set('foundation.minAmountPerInvestor', minAmountPerInvestor);
}
