import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { Accounts } from 'meteor/accounts-base';
import expect from 'must';
import faker from 'faker';

import { foundCompany } from '/server/methods/foundation/foundCompany';
import { foundationFactory, pttUserFactory, seasonFactory } from '/dev-utils/factories';
import { dbRound } from '/db/dbRound';
import { dbFoundations } from '/db/dbFoundations';
import { dbSeason } from '/db/dbSeason';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { dbLog } from '/db/dbLog';

describe('method foundCompany', function() {
  this.timeout(10000);

  let user;
  let foundCompanyData;
  let roundId;
  let seasonId;

  beforeEach(function() {
    resetDatabase();
    const { founderEarnestMoney, newRoundFoundationRestrictionTime, seasonTime, seasonNumberInRound } = Meteor.settings.public;

    const userId = Accounts.createUser(pttUserFactory.build());
    const money = faker.random.number({ min: founderEarnestMoney });
    Meteor.users.update(userId, { $set: { 'profile.money': money } });
    user = Meteor.users.findOne(userId);

    foundCompanyData = foundationFactory.build();
    delete foundCompanyData.createdAt;

    roundId = dbRound.insert({
      beginDate: new Date(Date.now() - newRoundFoundationRestrictionTime - 1000),
      endDate: new Date(Date.now() + seasonTime * seasonNumberInRound)
    });
    seasonId = dbSeason.insert(seasonFactory.build());
  });

  it('should fail if the user is in vacation', function() {
    user.profile.isInVacation = true;
    foundCompany.bind(null, user, foundCompanyData)
      .must.throw(Meteor.Error, '您現在正在渡假中，請好好放鬆！ [403]');
  });

  it('should fail if the user is not pay tax', function() {
    user.profile.notPayTax = true;
    foundCompany.bind(null, user, foundCompanyData)
      .must.throw(Meteor.Error, '您現在有稅單逾期未繳！ [403]');
  });

  it('should fail if the user is been ban manager', function() {
    user.profile.ban.push('manager');
    foundCompany.bind(null, user, foundCompanyData)
      .must.throw(Meteor.Error, '您現在被金融管理會禁止了擔任經理人的資格！ [403]');
  });

  it('should fail if the user is been ban deal', function() {
    user.profile.ban.push('deal');
    foundCompany.bind(null, user, foundCompanyData)
      .must.throw(Meteor.Error, '您現在被金融管理會禁止了所有投資下單行為！ [403]');
  });

  it('should fail if the user does not have enough money', function() {
    const { founderEarnestMoney } = Meteor.settings.public;
    user.profile.money = founderEarnestMoney - 1;
    foundCompany.bind(null, user, foundCompanyData)
      .must.throw(Meteor.Error, '您的現金不足，不足以支付投資保證金！ [401]');
  });

  it('should fail if the user has another company is been founding', function() {
    const userId = user._id;
    dbFoundations.insert(foundationFactory.build({ founder: userId }));
    foundCompany.bind(null, user, foundCompanyData)
      .must.throw(Meteor.Error, '您現在已經有一家新創公司正在申請中，無法同時發起第二家新創公司！ [403]');
  });


  it('should fail if is in new round foundation restriction time', function() {
    const { newRoundFoundationRestrictionTime } = Meteor.settings.public;
    dbRound.update(roundId, { $set: { beginDate: new Date(Date.now() - faker.random.number({ max: newRoundFoundationRestrictionTime - 600000 })) } });
    foundCompany.bind(null, user, foundCompanyData)
      .must.throw(Meteor.Error, '目前尚未開放新創計劃！ [403]');
  });

  it('should fail if is in last season of current round', function() {
    const { seasonTime } = Meteor.settings.public;
    dbRound.update(roundId, { $set: { endDate: new Date(Date.now() + faker.random.number({ max: seasonTime })) } });
    foundCompany.bind(null, user, foundCompanyData)
      .must.throw(Meteor.Error, '賽季度結束前的最後一個商業季度，禁止新創計劃！ [403]');
  });

  it('should fail if do not have enough time to found a company before current season end', function() {
    const { foundExpireTime } = Meteor.settings.public;
    const hours = Math.ceil(foundExpireTime / 3600000);
    dbSeason.update(seasonId, { $set: { endDate: new Date(Date.now() + faker.random.number({ max: foundExpireTime })) } });
    foundCompany.bind(null, user, foundCompanyData)
      .must.throw(Meteor.Error, `商業季度即將結束前${hours}小時，禁止新創計劃！ [403]`);
  });


  it('should fail if have the same name company is in foundation', function() {
    dbCompanyArchive.insert({
      status: 'foundation',
      companyName: foundCompanyData.companyName,
      tags: [],
      description: faker.random.words(10)
    });
    foundCompany.bind(null, user, foundCompanyData)
      .must.throw(Meteor.Error, '已有相同名稱的公司上市或創立中，無法創立同名公司！ [403]');
  });

  it('should fail if have the same name company is in market', function() {
    dbCompanyArchive.insert({
      status: 'market',
      companyName: foundCompanyData.companyName,
      tags: [],
      description: faker.random.words(10)
    });
    foundCompany.bind(null, user, foundCompanyData)
      .must.throw(Meteor.Error, '已有相同名稱的公司上市或創立中，無法創立同名公司！ [403]');
  });


  it('should success found company', function() {
    foundCompany.bind(null, user, foundCompanyData).must.not.throw();

    const companyArchiveData = dbCompanyArchive.findOne({ companyName: foundCompanyData.companyName, status: 'foundation' });
    expect(companyArchiveData).to.exist();
    const expectCompanyArchiveData = {
      _id: companyArchiveData._id,
      status: 'foundation',
      companyName: foundCompanyData.companyName,
      tags: foundCompanyData.tags,
      description: foundCompanyData.description
    };
    if (foundCompanyData.pictureSmall) {
      expectCompanyArchiveData.pictureSmall = foundCompanyData.pictureSmall;
    }
    if (foundCompanyData.pictureBig) {
      expectCompanyArchiveData.pictureBig = foundCompanyData.pictureBig;
    }
    expect(companyArchiveData).to.eql(expectCompanyArchiveData);

    const foundationData = dbFoundations.findOne(companyArchiveData._id);
    expect(foundationData).to.exist();

    const foundLog = dbLog.findOne({ logType: '創立公司' });
    expect(foundLog).to.exist();

    const investLog = dbLog.findOne({ logType: '參與投資' });
    expect(investLog).to.exist();

    const { founderEarnestMoney } = Meteor.settings.public;
    const userData = Meteor.users.findOne(user._id, { fields: { 'profile.money': 1 } });
    expect(userData.profile.money).to.equal(user.profile.money - founderEarnestMoney);
  });

  it('should inherit id if same name company is in archived', function() {
    const expectId = dbCompanyArchive.insert({
      status: 'archived',
      companyName: foundCompanyData.companyName,
      tags: [],
      description: faker.random.words(10)
    });
    foundCompany.bind(null, user, foundCompanyData).must.not.throw();
    expect(dbCompanyArchive.findOne(expectId).status).to.equal('foundation');
    expect(dbFoundations.findOne({ companyName: foundCompanyData.companyName })._id).to.equal(expectId);
  });
});
