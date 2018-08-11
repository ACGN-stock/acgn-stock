import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import expect from 'must';

import { registerEmployee } from '/server/methods/employee/registerEmployee';
import { companyFactory } from '/dev-utils/factories';
import { dbCompanies } from '/db/dbCompanies';
import { dbEmployees } from '/db/dbEmployees';

describe('method registerEmployee', function() {
  this.timeout(10000);

  const userId = 'someUser';
  let user;
  let companyId;

  beforeEach(function() {
    resetDatabase();

    user = {
      _id: userId,
      profile: {
        isInVacation: false,
        ban: []
      }
    };
    companyId = 'someCompany';
  });

  it('should fail if the user is in vacation', function() {
    user.profile.isInVacation = true;
    registerEmployee.bind(null, user, companyId)
      .must.throw(Meteor.Error, '您現在正在渡假中，請好好放鬆！ [403]');
    expect(dbEmployees.findOne({})).to.not.exist();
  });

  it('should fail if the user is been ban deal', function() {
    user.profile.ban.push('deal');
    registerEmployee.bind(null, user, companyId)
      .must.throw(Meteor.Error, '您現在被金融管理會禁止了所有投資下單行為！ [403]');
    expect(dbEmployees.findOne({})).to.not.exist();
  });

  it('should fail if the company does not exist', function() {
    registerEmployee.bind(null, user, companyId)
      .must.throw(Meteor.Error, '找不到識別碼為「' + companyId + '」的公司！ [404]');
    expect(dbEmployees.findOne({})).to.not.exist();
  });


  describe('when company is exist', function() {
    let companyId;
    let companyData;

    beforeEach(function() {
      companyId = dbCompanies.insert(companyFactory.build({ isSeal: false }));
      companyData = dbCompanies.findOne(companyId);
    });

    it('should fail if the company is been seal', function() {
      dbCompanies.update(companyId, { $set: { isSeal: true } });
      registerEmployee.bind(null, user, companyId)
        .must.throw(Meteor.Error, '「' + companyData.companyName + '」公司已被金融管理委員會查封關停了！ [403]');
      expect(dbEmployees.findOne({})).to.not.exist();
    });


    const employed = false;
    const resigned = false;

    it('should success register employee', function() {
      registerEmployee.bind(null, user, companyId).must.not.throw();

      const dbEmployeesData = dbEmployees.findOne({ userId, employed, resigned, companyId });
      expect(dbEmployeesData).to.exist();
    });

    it('should success register employee and only register in one company', function() {
      const companyId2 = dbCompanies.insert(companyFactory.build({ isSeal: false }));
      registerEmployee.bind(null, user, companyId).must.not.throw();
      registerEmployee.bind(null, user, companyId2).must.not.throw();

      const dbEmployeesData = dbEmployees.findOne({ userId, employed, resigned, companyId });
      const dbEmployeesData2 = dbEmployees.findOne({ userId, employed, resigned, companyId: companyId2 });
      expect(dbEmployeesData).to.not.exist();
      expect(dbEmployeesData2).to.exist();
    });
  });
});
