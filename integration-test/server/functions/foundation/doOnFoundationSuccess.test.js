import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { Factory } from 'rosie';
import faker from 'faker';
import expect from 'must';
import mustSinon from 'must-sinon';

import { dbVariables } from '/db/dbVariables';
import { dbFoundations } from '/db/dbFoundations';
import { dbCompanies } from '/db/dbCompanies';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { dbLog } from '/db/dbLog';
import { dbPrice } from '/db/dbPrice';
import { dbDirectors } from '/db/dbDirectors';
import { foundationFactory } from '/dev-utils/factories';
import { doOnFoundationSuccess } from '/server/functions/foundation/doOnFoundationSuccess';

mustSinon(expect);

describe('function doOnFoundationSuccess', function() {
  this.timeout(10000);

  const { maximumInvest: maxAmountPerInvestor } = Meteor.settings.public;

  const minInvestorCount = 10;
  const minAmountPerInvestor = 100;

  const investorFactory = new Factory()
    .sequence('userId', (n) => {
      return `user${n}`;
    })
    .attr('amount', () => {
      return faker.random.number({
        min: minAmountPerInvestor,
        max: maxAmountPerInvestor
      });
    });


  const investors = investorFactory.buildList(minInvestorCount);

  let companyId;

  beforeEach(function() {
    resetDatabase();

    dbVariables.set('foundation.minInvestorCount', minInvestorCount);
    dbVariables.set('foundation.minAmountPerInvestor', minAmountPerInvestor);

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
      Meteor.users.rawCollection().insert({ _id: userId, profile: { money: 0 } });
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
