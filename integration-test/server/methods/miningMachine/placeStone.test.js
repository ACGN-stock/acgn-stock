import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import expect from 'must';
import sinon from 'sinon';
import mustSinon from 'must-sinon';

import { pttUserFactory } from '/dev-utils/factories';
import { dbCompanyStones, stoneDisplayName } from '/db/dbCompanyStones';
import { dbSeason } from '/db/dbSeason';
import { placeStone } from '/server/methods/miningMachine/placeStone';

mustSinon(expect);

describe('method placeStone', function() {
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

  it('should allow the user to place a stone', function() {
    placeStone({ userId, companyId, stoneType });
    dbCompanyStones.findOne({ userId, companyId, stoneType }).must.be.exist();
    Meteor.users.findOne(userId).profile.stones[stoneType].must.be.equal(stoneCount - 1);
  });

  it('should fail if the user has already placed a stone in the specified company', function() {
    dbCompanyStones.insert({ userId, companyId, stoneType, placedAt: new Date() });
    placeStone.bind(null, { userId, companyId, stoneType }).must.throw(Meteor.Error, '您已經在同一家公司投入過石頭了！ [403]');
  });

  it('should fail if the stone amount of the user is not enough', function() {
    Meteor.users.update(userId, { $set: { [`profile.stones.${stoneType}`]: 0 } });
    placeStone.bind(null, { userId, companyId, stoneType }).must.throw(Meteor.Error, `${stoneDisplayName(stoneType)}的數量不足！ [403]`);
  });

  it('should fail if the user tries to retrieve a stone when the mining machine is in operation', function() {
    dbSeason.update(seasonId, { $set: { endDate: new Date(Date.now() + miningMachineOperationTime) } });
    placeStone.bind(null, { userId, companyId, stoneType }).must.throw(Meteor.Error, '現在是挖礦機運轉時間，無法放石！ [403]');
  });
});
