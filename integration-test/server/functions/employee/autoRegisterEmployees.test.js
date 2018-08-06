import { resetDatabase } from 'meteor/xolvio:cleaner';
import { Accounts } from 'meteor/accounts-base';
import faker from 'faker';
import expect from 'must';

import { autoRegisterEmployees } from '/server/functions/employee/autoRegisterEmployees';
import { pttUserFactory } from '/dev-utils/factories';
import { dbEmployees } from '/db/dbEmployees';
import { dbLog } from '/db/dbLog';

describe('function autoRegisterEmployees', function() {
  this.timeout(10000);

  let companyId;
  let userId;
  let registerAt;

  beforeEach(function() {
    resetDatabase();
    companyId = 'someCompany';
    userId = Accounts.createUser(pttUserFactory.build());
    registerAt = new Date();
    dbEmployees.insert({ companyId, userId, registerAt, employed: true });
  });

  it('should not register employees if no active user', function() {
    autoRegisterEmployees();
    expect(findRegisterEmployee({ companyId, userId })).to.not.exist();
  });

  it('should register employees for active user', function() {
    letUserActive(userId);
    autoRegisterEmployees();

    expect(findRegisterEmployee({ companyId, userId })).to.exist();
  });


  describe('when multi-user and multi companies', function() {
    let testGroups;

    beforeEach(function() {
      testGroups = [ { userId, companyId } ];

      const newUserTest = 2;
      for (let i = 0; i < newUserTest; i += 1) {
        const newUserId = Accounts.createUser(pttUserFactory.build());
        const newTestGroup = { userId: newUserId, companyId };
        testGroups.push(newTestGroup);
        dbEmployees.insert({ ...newTestGroup, registerAt, employed: true });
      }

      const newCompanyTest = 2;
      for (let i = 0; i < newCompanyTest; i += 1) {
        const newUserId = Accounts.createUser(pttUserFactory.build());
        const newCompanyId = faker.random.uuid();
        const newTestGroup = { userId: newUserId, companyId: newCompanyId };
        testGroups.push(newTestGroup);
        dbEmployees.insert({ ...newTestGroup, registerAt, employed: true });
      }
    });

    it('should register employees for active users', function() {
      letUserActive(testGroups[0].userId);
      letUserActive(testGroups[3].userId);
      autoRegisterEmployees();

      expect(findRegisterEmployee(testGroups[0])).to.exist();
      expect(findRegisterEmployee(testGroups[1])).to.not.exist();
      expect(findRegisterEmployee(testGroups[2])).to.not.exist();
      expect(findRegisterEmployee(testGroups[3])).to.exist();
      expect(findRegisterEmployee(testGroups[4])).to.not.exist();
    });
  });
});

function findRegisterEmployee(selector) {
  if (selector) {
    return dbEmployees.findOne({ ...selector, employed: false, resigned: false });
  }
  else {
    return dbEmployees.findOne({ employed: false, resigned: false });
  }
}

function letUserActive(userId) {
  const companyId = 'someCompany';
  const productId = 'someProduct';
  dbLog.insert({
    logType: '推薦產品',
    userId: [userId],
    companyId,
    data: { productId },
    createdAt: new Date()
  });
}
