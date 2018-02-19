import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import expect from 'must';
import mustSinon from 'must-sinon';

import { companyFactory, foundationFactory, orderFactory, taxFactory } from '/dev-utils/factories';
import { dbCompanies } from '/db/dbCompanies';
import { dbFoundations } from '/db/dbFoundations';
import { dbOrders } from '/db/dbOrders';
import { dbTaxes } from '/db/dbTaxes';
import { dbEmployees } from '/db/dbEmployees';
import { dbRound } from '/db/dbRound';
import { startVacation } from '/server/methods/vacation/startVacation';

mustSinon(expect);

describe('method startVacation', function() {
  this.timeout(10000);

  const userData = {
    username: 'someone',
    password: 'mypass',
    profile: {
      name: 'someone',
      validateType: 'PTT'
    }
  };

  let userId;
  let roundId;

  beforeEach(function() {
    resetDatabase();
    roundId = dbRound.insert({ beginDate: new Date(), endDate: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000) });
    userId = Accounts.createUser(userData);
  });

  it('should fail if the user is already in vacation', function() {
    Meteor.users.update({ _id: userId }, { $set: { 'profile.isInVacation': true } });
    startVacation.bind(null, userId).must.throw(Meteor.Error, '您已經處於渡假狀態！ [403]');
  });

  const roundRemainingTimeLimit = Meteor.settings.public.seasonTime * 2;
  it(`should fail if the remaining time of the current round is less than ${roundRemainingTimeLimit} ms`, function() {
    dbRound.update({ _id: roundId }, { $set: { endDate: new Date(Date.now() + roundRemainingTimeLimit - 1) } });
    startVacation.bind(null, userId).must.throw(Meteor.Error, '賽季結束前兩週禁止渡假！ [403]');
  });

  it('should fail if the time passed since the last vacation is too short', function() {
    Meteor.users.update({ _id: userId }, { $set: { 'profile.lastVacationEndDate': new Date() } });
    startVacation.bind(null, userId).must.throw(Meteor.Error, '距離上次收假時間過短，無法再次渡假！ [403]');
  });

  it('should fail if the user is a manager of a regular company', function() {
    dbCompanies.insert(companyFactory.build({ manager: userId }));
    startVacation.bind(null, userId).must.throw(Meteor.Error, '您有擔任公司經理職務，無法進行渡假！ [403]');
  });

  it('should success if the user is a manager of a sealed company', function() {
    dbCompanies.insert(companyFactory.build({ manager: userId, isSeal: true }));
    startVacation.bind(null, userId).must.not.throw();
  });

  it('should fail if the user is a manager of a fundation company', function() {
    dbFoundations.insert(foundationFactory.build({ manager: userId }));
    startVacation.bind(null, userId).must.throw(Meteor.Error, '您有擔任公司經理職務，無法進行渡假！ [403]');
  });

  it('should fail if the user is contending manager of a company', function() {
    dbCompanies.insert(companyFactory.build({ candidateList: [userId] }));
    startVacation.bind(null, userId).must.throw(Meteor.Error, '您正在競選公司經理人，無法進行渡假！ [403]');
  });

  it('should fail if the user is contending manager of a sealed company', function() {
    dbCompanies.insert(companyFactory.build({ candidateList: [userId], isSeal: true }));
    startVacation.bind(null, userId).must.not.throw();
  });

  it('should fail if the user is a chairman of a company', function() {
    dbCompanies.insert(companyFactory.build({ chairman: userId }));
    startVacation.bind(null, userId).must.throw(Meteor.Error, '您有擔任公司董事長，無法進行渡假！ [403]');
  });

  it('should success if the user is a chairman of a sealed company', function() {
    dbCompanies.insert(companyFactory.build({ chairman: userId, isSeal: true }));
    startVacation.bind(null, userId).must.not.throw();
  });

  it('should fail if the user has any unfulfilled orders', function() {
    const companyId = dbCompanies.insert(companyFactory.build());
    dbOrders.insert(orderFactory.build({ userId, companyId }));
    startVacation.bind(null, userId).must.throw(Meteor.Error, '您有進行中的買賣單，全部撤回後才能進行渡假！ [403]');
  });

  it('should fail if the user has any unpaid taxes', function() {
    dbTaxes.insert(taxFactory.build({ userId }));
    startVacation.bind(null, userId).must.throw(Meteor.Error, '您現在有稅單未繳，全部結清後才能進行渡假！ [403]');
  });

  it('should fail if the user is registered as an employee of a company for the next season', function() {
    const companyId = dbCompanies.insert(companyFactory.build());
    dbEmployees.insert({ userId, companyId, registerAt: new Date() });
    startVacation.bind(null, userId).must.throw(Meteor.Error, '您有登記為公司的儲備員工，無法進行渡假！ [403]');
  });

  it('should mark the user as being in vacation when success', function() {
    startVacation.bind(null, userId).must.not.throw();
    const user = Meteor.users.findOne(userId);
    user.profile.isInVacation.must.be.true();
    user.profile.isEndingVacation.must.be.false();
    user.profile.lastVacationStartDate.must.be.exist();
  });

  it('should allow past employees to start vacation', function() {
    const companyId = dbCompanies.insert(companyFactory.build());
    dbEmployees.insert({ userId, companyId, employed: false, resigned: true, registerAt: new Date() });
    startVacation.bind(null, userId).must.not.throw();
  });
});
