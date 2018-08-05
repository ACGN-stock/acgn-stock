import { dbEmployees } from '/db/dbEmployees';

// 將所有 儲備員工 更新為 在職員工
export function hireEmployees() {
  dbEmployees.update(
    { employed: false, resigned: false },
    { $set: { employed: true } },
    { multi: true }
  );

  removeErrorCompanies();
  removeErrorUsers();
}

function removeErrorCompanies() {
  const normalCompanies = dbEmployees
    .aggregate([
      { $match: { employed: true, resigned: false } },
      {
        $group: {
          _id: '$companyId',
          ids: { $push: { id: '$_id' } }
        }
      },
      {
        $lookup: {
          from: 'companies',
          localField: '_id',
          foreignField: '_id',
          as: 'companyData'
        }
      },
      { $unwind: '$companyData' },
      { $match: { 'companyData.isSeal': false } }
    ])
    .map(({ _id }) => {
      return _id;
    });
  dbEmployees.remove({ companyId: { $nin: normalCompanies }, employed: true, resigned: false });
}

function removeErrorUsers() {
  const normalUsers = dbEmployees
    .aggregate([
      { $match: { employed: true, resigned: false } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userData'
        }
      },
      { $unwind: '$userData' },
      {
        $match: {
          'userData.profile.isInVacation': false,
          'userData.profile.ban': { $nin: ['deal'] }
        }
      }
    ])
    .map(({ userId }) => {
      return userId;
    });
  dbEmployees.remove({ userId: { $nin: normalUsers }, employed: true, resigned: false });
}
