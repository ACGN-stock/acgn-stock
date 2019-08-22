import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import faker from 'faker';
import expect from 'must';
import mustSinon from 'must-sinon';

import { dbVariables } from '/db/dbVariables';
import { dbFoundations } from '/db/dbFoundations';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { dbLog } from '/db/dbLog';
import { foundationFactory } from '/dev-utils/factories';
import { doOnFoundationFailure } from '/server/functions/foundation/doOnFoundationFailure';

mustSinon(expect);

describe('function doOnFoundationFailure', function() {
  this.timeout(10000);

  const minInvestorCount = 10;
  const minAmountPerInvestor = 100;

  const investors = [
    { userId: 'aUser', amount: 1 },
    { userId: 'someUser', amount: 1234 },
    { userId: 'anotherUser', amount: 4321 }
  ];

  let companyId;

  beforeEach(async function() {
    resetDatabase();

    dbVariables.set('foundation.minInvestorCount', minInvestorCount);
    dbVariables.set('foundation.minAmountPerInvestor', minAmountPerInvestor);

    companyId = dbFoundations.insert(foundationFactory.build({
      pictureSmall: faker.image.imageUrl(),
      pictureLarge: faker.image.imageUrl(),
      illegalReason: '一二三四五六七八九十',
      invest: investors
    }));

    await dbCompanyArchive.rawCollection().insert({ _id: companyId });
    await dbLog.rawCollection().insert({ companyId });
  });

  it('should remove the foundation data', function() {
    const foundationData = dbFoundations.findOne(companyId);
    doOnFoundationFailure(foundationData);

    const companyArchiveData = dbCompanyArchive.findOne(companyId);
    expect(companyArchiveData).to.exist();
    expect(companyArchiveData.status).to.equal('archived');
    expect(dbFoundations.findOne(companyId)).to.not.exist();
    expect(dbLog.findOne({ companyId })).to.not.exist();
  });

  it('should write a 創立失敗 log', function() {
    const foundationData = dbFoundations.findOne(companyId);
    doOnFoundationFailure(foundationData);

    const logData = dbLog.findOne({ logType: '創立失敗' });
    expect(logData).to.exist();
    logData.userId.must.be.eql(_.pluck(investors, 'userId'));
    logData.data.companyName.must.be.equal(foundationData.companyName);
  });

  it('should return fund to the investors', function() {
    investors.forEach(({ userId }) => {
      Meteor.users.rawCollection().insert({ _id: userId, profile: { money: 0 } });
    });

    const foundationData = dbFoundations.findOne(companyId);
    doOnFoundationFailure(foundationData);

    investors.forEach(({ userId, amount }) => {
      const refundLog = dbLog.findOne({ logType: '創立退款', userId });
      const { refund } = refundLog.data;
      const { money } = Meteor.users.findOne(userId).profile;

      refund.must.be.equal(amount);
      money.must.be.equal(amount);
    });
  });

  it('should return only fund except "founderEarnestMoney" if the investor is the founder', function() {
    const extraAmount = 1000;
    const founderUserId = 'the-founder';

    const founderInvestor = {
      userId: founderUserId,
      amount: Meteor.settings.public.founderEarnestMoney + extraAmount
    };

    Meteor.users.rawCollection().insert({ _id: founderUserId, profile: { money: 0 } });

    dbFoundations.update(companyId, {
      $set: { founder: founderUserId },
      $push: { invest: founderInvestor }
    });
    const foundationData = dbFoundations.findOne(companyId);
    doOnFoundationFailure(foundationData);

    const { refund } = dbLog.findOne({ logType: '創立退款', userId: founderUserId }).data;
    const { money } = Meteor.users.findOne(founderUserId).profile;

    refund.must.be.equal(extraAmount);
    money.must.be.equal(extraAmount);
  });
});
