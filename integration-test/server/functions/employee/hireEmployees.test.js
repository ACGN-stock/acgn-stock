import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { Accounts } from 'meteor/accounts-base';
import expect from 'must';

import { hireEmployees } from '/server/functions/employee/hireEmployees';
import { companyFactory, pttUserFactory } from '/dev-utils/factories';
import { dbCompanies } from '/db/dbCompanies';
import { dbEmployees } from '/db/dbEmployees';

describe('function hireEmployees', function() {
  this.timeout(10000);

  let companyId;
  let userId;
  let registerAt;

  beforeEach(function() {
    resetDatabase();
    companyId = dbCompanies.insert(companyFactory.build());
    userId = Accounts.createUser(pttUserFactory.build());
    registerAt = new Date();
    dbEmployees.insert({ companyId, userId, registerAt });
  });

  it('should not hire if the user is in vacation', function() {
    setUserInVacation(userId);
    hireEmployees();

    expect(findHiredEmployee()).to.not.exist();
  });

  it('should not hire if the user is been ban deal', function() {
    setUserBeenBanDeal(userId);
    hireEmployees();

    expect(findHiredEmployee()).to.not.exist();
  });

  it('should not hire if the company does not exist', function() {
    setCompanyNotExist(companyId);
    hireEmployees();

    expect(findHiredEmployee()).to.not.exist();
  });

  it('should not hire if the company is been seal', function() {
    setCompanyBeenSeal(companyId);
    hireEmployees();

    expect(findHiredEmployee()).to.not.exist();
  });

  it('should hire employee', function() {
    hireEmployees();
    expect(findHiredEmployee({ companyId, userId, registerAt })).to.exist();
  });


  describe('when multi-user and multi companies', function() {
    let testGroups;

    beforeEach(function() {
      testGroups = [ { userId, companyId, registerAt } ];

      const newUserTest = 2;
      for (let i = 0; i < newUserTest; i += 1) {
        const newUserId = Accounts.createUser(pttUserFactory.build());
        const newTestGroup = { userId: newUserId, companyId, registerAt };
        testGroups.push(newTestGroup);
        dbEmployees.insert(newTestGroup);
      }

      const newCompanyTest = 2;
      for (let i = 0; i < newCompanyTest; i += 1) {
        const newUserId = Accounts.createUser(pttUserFactory.build());
        const newCompanyId = dbCompanies.insert(companyFactory.build());
        const newTestGroup = { userId: newUserId, companyId: newCompanyId, registerAt };
        testGroups.push(newTestGroup);
        dbEmployees.insert(newTestGroup);
      }
    });

    it('should hire normal employees and not be affected by other violations', function() {
      setUserInVacation(testGroups[1].userId);
      setUserBeenBanDeal(testGroups[2].userId);
      setCompanyNotExist(testGroups[3].companyId);
      setCompanyBeenSeal(testGroups[4].companyId);
      hireEmployees();

      expect(findHiredEmployee(testGroups[0])).to.exist();
      expect(findHiredEmployee(testGroups[1])).to.not.exist();
      expect(findHiredEmployee(testGroups[2])).to.not.exist();
      expect(findHiredEmployee(testGroups[3])).to.not.exist();
      expect(findHiredEmployee(testGroups[4])).to.not.exist();
    });

    it('should hire all normal employees', function() {
      hireEmployees();
      testGroups.forEach((testGroup) => {
        expect(findHiredEmployee(testGroup)).to.exist();
      });
    });
  });
});

function findHiredEmployee(selector) {
  if (selector) {
    return dbEmployees.findOne({ ...selector, employed: true, resigned: false });
  }
  else {
    return dbEmployees.findOne({ employed: true, resigned: false });
  }
}

function setUserInVacation(userId) {
  Meteor.users.update(userId, { $set: { 'profile.isInVacation': true } });
}

function setUserBeenBanDeal(userId) {
  Meteor.users.update(userId, { $addToSet: { 'profile.ban': 'deal' } });
}

function setCompanyNotExist(companyId) {
  dbCompanies.remove(companyId);
}

function setCompanyBeenSeal(companyId) {
  dbCompanies.update(companyId, { $set: { isSeal: true } });
}
