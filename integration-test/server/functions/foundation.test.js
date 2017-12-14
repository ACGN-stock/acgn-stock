import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { Factory } from 'rosie';
import faker from 'faker';
import expect from 'must';
import mustSinon from 'must-sinon';
import sinon from 'sinon';

import { dbFoundations } from '/db/dbFoundations';
import { dbCompanies } from '/db/dbCompanies';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { dbLog } from '/db/dbLog';
import { dbPrice } from '/db/dbPrice';
import { dbDirectors } from '/db/dbDirectors';
import { foundationFactory } from '/dev-utils/factories';
import { checkExpiredFoundations, doOnFoundationSuccess, doOnFoundationFailure } from '/server/functions/foundation/checkExpiredFoundations';

mustSinon(expect);

const investorFactory = new Factory()
  .sequence('userId', (n) => {
    return `user${n}`;
  })
  .attr('amount', () => {
    return faker.random.number({
      min: Math.ceil(Meteor.settings.public.minReleaseStock / Meteor.settings.public.foundationNeedUsers),
      max: Meteor.settings.public.maximumInvest
    });
  });

describe('function checkExpiredFoundations', function() {
  const successInvestors = investorFactory.buildList(Meteor.settings.public.foundationNeedUsers);

  let clock;

  beforeEach(function() {
    resetDatabase();
    clock = sinon.useFakeTimers(new Date());
  });

  afterEach(function() {
    clock.restore();
  });

  it('should process expired foundations', function() {
    const expiredSuccessfulFoundationId = dbFoundations.insert(foundationFactory.build({
      createdAt: new Date(Date.now() - Meteor.settings.public.foundExpireTime - 1),
      invest: successInvestors
    }));

    const expiredFailedFoundationId = dbFoundations.insert(foundationFactory.build({
      createdAt: new Date(Date.now() - Meteor.settings.public.foundExpireTime - 1),
      invest: []
    }));

    const unexpiredFoundationId = dbFoundations.insert(foundationFactory.build({
      createdAt: new Date(Date.now())
    }));

    checkExpiredFoundations();

    // sinon 沒有簡單方法 spy free functions，以 foundation 存在與否判別是否有被處理
    expect(dbFoundations.findOne(expiredSuccessfulFoundationId)).to.not.exist();
    expect(dbFoundations.findOne(expiredFailedFoundationId)).to.not.exist();
    dbFoundations.findOne(unexpiredFoundationId).must.be.exist();
  });
});

describe('function doOnFoundationSuccess', function() {
  const investors = investorFactory.buildList(Meteor.settings.public.foundationNeedUsers);

  let companyId;

  beforeEach(function() {
    resetDatabase();

    companyId = dbFoundations.insert(foundationFactory.build({
      invest: investors
    }));

    dbCompanyArchive.rawCollection().insert({
      _id: companyId,
      status: 'foundation'
    });
  });

  it('should remove the foundation from foundations', function() {
    const foundationData = dbFoundations.findOne(companyId);
    doOnFoundationSuccess(foundationData);
    expect(dbFoundations.findOne(companyId)).to.not.exist();
  });

  it('should create a new company based on the foundation data', function() {
    // optional fields
    dbFoundations.update(companyId, {
      $set: {
        pictureSmall: faker.image.imageUrl(),
        pictureBig: faker.image.imageUrl(),
        illegalReason: '一二三四五六七八九十'
      }
    });

    const basicCompanyDataFields = ['_id', 'companyName', 'manager', 'tags', 'description', 'illegalReason', 'pictureSmall', 'pictureBig'];

    const foundationData = dbFoundations.findOne(companyId);
    doOnFoundationSuccess(foundationData);

    const companyData = dbCompanies.findOne(companyId);
    expect(companyData).to.exist();

    const basicCompanyData = _.pick(companyData, basicCompanyDataFields);
    const basicFoundationData = _.pick(foundationData, basicCompanyDataFields);
    basicCompanyData.must.be.eql(basicFoundationData);
  });

  it('should write a 創立成功 log', function() {
    const foundationData = dbFoundations.findOne(companyId);
    doOnFoundationSuccess(foundationData);
    const { listPrice } = dbCompanies.findOne(companyId);

    const logData = dbLog.findOne({ logType: '創立成功', companyId });
    expect(logData).to.exist();
    logData.userId.must.be.eql(_.pluck(investors, 'userId'));
    logData.data.price.must.be.equal(listPrice);
  });

  it('should record the initial price', function() {
    const foundationData = dbFoundations.findOne(companyId);
    doOnFoundationSuccess(foundationData);
    const { listPrice } = dbCompanies.findOne(companyId);

    const priceData = dbPrice.findOne({ companyId });
    expect(priceData).to.exist();
    priceData.price.must.be.equal(listPrice);
  });

  it('should set the status the corresponding companyArchive entry to "market"', function() {
    const foundationData = dbFoundations.findOne(companyId);
    doOnFoundationSuccess(foundationData);
    dbCompanyArchive.findOne(companyId).status.must.be.equal('market');
  });

  it('should create directors data', function() {
    const foundationData = dbFoundations.findOne(companyId);
    doOnFoundationSuccess(foundationData);
    const { listPrice } = dbCompanies.findOne(companyId);
    const directors = dbDirectors.find({ companyId, userId: { $in: _.pluck(investors, 'userId') } });
    directors.count().must.be.equal(investors.length);

    const ownStocksHash = directors.fetch().reduce((obj, { userId, stocks }) => {
      obj[userId] = stocks;

      return obj;
    }, {});

    investors.forEach(({ userId, amount }) => {
      const stocks = ownStocksHash[userId];
      (amount - stocks * listPrice).must.be.between(0, listPrice);
    });
  });

  it('should return excess fund to the investors', function() {
    investors.forEach(({ userId }) => {
      Meteor.users.rawCollection().insert({ _id: userId, profile: { money: 0 }});
    });

    const foundationData = dbFoundations.findOne(companyId);
    doOnFoundationSuccess(foundationData);

    const { listPrice } = dbCompanies.findOne(companyId);

    investors.forEach(({ userId, amount }) => {
      const { money } = Meteor.users.findOne(userId).profile;

      const refundLog = dbLog.findOne({ logType: '創立退款', userId });
      const refund = refundLog ? refundLog.data.refund : 0;

      const director = dbDirectors.findOne({ companyId, userId });
      const stocks = director ? director.stocks : 0;

      (stocks * listPrice + refund).must.be.equal(amount);
      money.must.be.equal(refund);
    });
  });
});

describe('function doOnFoundationFailure', function() {
  const investors = [
    { userId: 'aUser', amount: 1 },
    { userId: 'someUser', amount: 1234 },
    { userId: 'anotherUser', amount: 4321 }
  ];

  let companyId;

  beforeEach(function() {
    resetDatabase();

    companyId = dbFoundations.insert(foundationFactory.build({
      pictureSmall: faker.image.imageUrl(),
      pictureLarge: faker.image.imageUrl(),
      illegalReason: '一二三四五六七八九十',
      invest: investors
    }));

    dbCompanyArchive.rawCollection().insert({ _id: companyId });
    dbLog.rawCollection().insert({ companyId });
  });

  it('should remove the foundation data', function() {
    const foundationData = dbFoundations.findOne(companyId);
    doOnFoundationFailure(foundationData);

    expect(dbFoundations.findOne(companyId)).to.not.exist();
    expect(dbCompanyArchive.findOne(companyId)).to.not.exist();
    expect(dbLog.findOne({ companyId })).to.not.exist();
  });

  it('should write a 創立失敗 log', function() {
    const foundationData = dbFoundations.findOne(companyId);
    doOnFoundationFailure(foundationData);

    const logData = dbLog.findOne({ logType: '創立失敗' });
    expect(logData).to.exist();
    logData.userId.must.be.eql(_.union([foundationData.manager], _.pluck(investors, 'userId')));
    logData.data.companyName.must.be.equal(foundationData.companyName);
  });

  it('should return fund to the investors', function() {
    investors.forEach(({ userId }) => {
      Meteor.users.rawCollection().insert({ _id: userId, profile: { money: 0 }});
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

  it('should return only fund except "founderEarnestMoney" if the investor is the manager', function() {
    const extraAmount = 1000;
    const managerUserId = 'manager';

    const managerInvestor = {
      userId: managerUserId,
      amount: Meteor.settings.public.founderEarnestMoney + extraAmount
    };

    Meteor.users.rawCollection().insert({ _id: managerUserId, profile: { money: 0 }});

    dbFoundations.update(companyId, {
      $set: { manager: managerUserId },
      $push: { invest: managerInvestor }
    });
    const foundationData = dbFoundations.findOne(companyId);
    doOnFoundationFailure(foundationData);

    const { refund } = dbLog.findOne({ logType: '創立退款', userId: managerUserId }).data;
    const { money } = Meteor.users.findOne(managerUserId).profile;

    refund.must.be.equal(extraAmount);
    money.must.be.equal(extraAmount);
  });
});
