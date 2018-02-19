import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import expect from 'must';
import sinon from 'sinon';
import mustSinon from 'must-sinon';

import { pttUserFactory } from '/dev-utils/factories';
import { dbCompanyStones } from '/db/dbCompanyStones';
import { dbSeason } from '/db/dbSeason';
import { retrieveStone } from '/server/methods/miningMachine/retrieveStone';

mustSinon(expect);

describe('method retrieveStone', function() {
  this.timeout(10000);

  let clock;
  let userId;
  let seasonId;
  const companyId = 'someCompany';
  const stoneType = 'saint';
  const stoneCount = 10;
  const { miningMachineOperationTime } = Meteor.settings.public;

  beforeEach(function() {
    resetDatabase();

    clock = sinon.useFakeTimers();

    userId = Accounts.createUser(pttUserFactory.build());
    Meteor.users.update(userId, { $set: { [`profile.stones.${stoneType}`]: stoneCount } });
    seasonId = dbSeason.insert({ endDate: new Date(Date.now() + miningMachineOperationTime + 1) }, { validate: false });
  });

  afterEach(function() {
    clock.restore();
  });

  it('should let the user retrieve a stone placed in the specified company', function() {
    const companyStonesId = dbCompanyStones.insert({ userId, companyId, stoneType, placedAt: new Date() });
    retrieveStone({ userId, companyId });
    expect(dbCompanyStones.findOne(companyStonesId)).to.not.exist();
    Meteor.users.findOne(userId).profile.stones[stoneType].must.equal(stoneCount + 1);
  });

  it('should fail if the user has not placed a stone in the specified company', function() {
    retrieveStone.bind(null, { userId, companyId }).must.throw(Meteor.Error, '您並未在此公司放置石頭！ [403]');
  });

  it('should fail if the user tries to retrieve a stone when the mining machine is in operation', function() {
    dbSeason.update(seasonId, { $set: { endDate: new Date(Date.now() + miningMachineOperationTime) } });
    retrieveStone.bind(null, { userId, companyId }).must.throw(Meteor.Error, '現在是挖礦機運轉時間，無法放石！ [403]');
  });
});
