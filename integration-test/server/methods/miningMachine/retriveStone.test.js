import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import expect from 'must';
import sinon from 'sinon';
import mustSinon from 'must-sinon';

import { pttUserFactory } from '/dev-utils/factories';
import { dbCompanyStones } from '/db/dbCompanyStones';
import { dbSeason } from '/db/dbSeason';
import { dbLog } from '/db/dbLog';
import { retriveStone } from '/server/methods/miningMachine/retriveStone';

mustSinon(expect);

describe('method retriveStone', function() {
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

  it('should let the user retrive a stone placed in the specified company', function() {
    const companyStonesId = dbCompanyStones.insert({ userId, companyId, stoneType, placedAt: new Date() });
    retriveStone({ userId, companyId });
    expect(dbCompanyStones.findOne(companyStonesId)).to.not.exist();
    Meteor.users.findOne(userId).profile.stones[stoneType].must.equal(stoneCount + 1);
    const logData = dbLog.findOne({ logType: '礦機取石', 'userId.0': userId, companyId });
    logData.data.must.be.eql({ stoneType });
  });

  it('should fail if the user has not placed a stone in the specified company', function() {
    retriveStone.bind(null, { userId, companyId }).must.throw(Meteor.Error, '您並未在此公司放置石頭！ [403]');
  });

  it('should fail if the user tries to retrive a stone when the mining machine is in operation', function() {
    dbSeason.update(seasonId, { $set: { endDate: new Date(Date.now() + miningMachineOperationTime) } });
    retriveStone.bind(null, { userId, companyId }).must.throw(Meteor.Error, '現在是挖礦機運轉時間，無法放石！ [403]');
  });
});
