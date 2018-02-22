import { resetDatabase } from 'meteor/xolvio:cleaner';
import expect from 'must';
import mustSinon from 'must-sinon';

import { dbCompanies } from '/db/dbCompanies';
import { dbDirectors } from '/db/dbDirectors';
import { companyFactory } from '/dev-utils/factories';
import { checkChairman } from '/server/functions/company/checkChairman';

mustSinon(expect);

describe('function checkChairman', function() {
  this.timeout(10000);

  let companyId;

  beforeEach(function() {
    resetDatabase();

    companyId = dbCompanies.insert(companyFactory.build({ chairman: 'originalChairman' }));
  });

  it('should make the director who has the most stocks be the chairman', function() {
    dbDirectors.insert({ userId: 'user1', companyId, stocks: 100, createdAt: new Date() });
    dbDirectors.insert({ userId: 'user2', companyId, stocks: 110, createdAt: new Date() });

    checkChairman();

    dbCompanies.findOne(companyId).chairman.must.be.equal('user2');
  });

  it('should make the director who comes earliest be the chairman if all the directors has the same amount of stocks', function() {
    dbDirectors.insert({ userId: 'user1', companyId, stocks: 100, createdAt: new Date(0) });
    dbDirectors.insert({ userId: 'user2', companyId, stocks: 100, createdAt: new Date(1) });

    checkChairman();

    dbCompanies.findOne(companyId).chairman.must.be.equal('user1');
  });

  it('should exclude user !FSC from being a chairman', function() {
    dbDirectors.insert({ userId: '!FSC', companyId, stocks: 100, createdAt: new Date() });
    dbDirectors.insert({ userId: 'user1', companyId, stocks: 90, createdAt: new Date() });

    checkChairman();

    dbCompanies.findOne(companyId).chairman.must.be.equal('user1');
  });

  it('should set the chairman to !none if the user !FSC is the only director', function() {
    dbDirectors.insert({ userId: '!FSC', companyId, stocks: 100, createdAt: new Date() });

    checkChairman();

    dbCompanies.findOne(companyId).chairman.must.be.equal('!none');
  });

  it('should set the chairman to !none if there is no director', function() {
    checkChairman();

    dbCompanies.findOne(companyId).chairman.must.be.equal('!none');
  });
});
