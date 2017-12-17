import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbEmployees } from '/db/dbEmployees';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  setEmployeeMessage(companyId, message) {
    check(this.userId, String);
    check(companyId, String);
    check(message, String);
    setEmployeeMessage(this.userId, companyId, message);

    return true;
  }
});
export function setEmployeeMessage(userId, companyId, message) {
  debug.log('setEmployeeMessage', { userId, companyId, message });

  const employeeData = dbEmployees
    .findOne(
      { companyId, userId, employed: true, resigned: false },
      { sort: { registerAt: -1 }, fields: { _id: 1 } });

  if (! employeeData) {
    throw new Meteor.Error(401, '使用者並非公司的在職員工，無法進行員工留言！');
  }

  dbEmployees.update(employeeData._id, { $set: { message } });
}
