import { dbEmployees } from '/db/dbEmployees';
import { computeActiveUserIds } from '/server/imports/utils/computeActiveUserIds';

// 為 在職員工 報名 儲備員工
export function autoRegisterEmployees() {
  const registerAt = new Date();
  const activeUsers = computeActiveUserIds();
  dbEmployees
    .find(
      {
        employed: true,
        resigned: false,
        userId: { $in: activeUsers }
      }, {
        fields: {
          userId: 1,
          companyId: 1
        }
      }
    )
    .forEach(({ userId, companyId }) => {
      dbEmployees.insert({ userId, companyId, registerAt });
    });
}
