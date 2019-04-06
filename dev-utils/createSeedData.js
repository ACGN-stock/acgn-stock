import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';

import { dbAdvertising } from '/db/dbAdvertising';
import { dbCompanies } from '/db/dbCompanies';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { dbDirectors } from '/db/dbDirectors';
import { dbFoundations } from '/db/dbFoundations';
import { dbLog } from '/db/dbLog';
import { dbOrders } from '/db/dbOrders';
import { dbPrice } from '/db/dbPrice';
import { dbProducts } from '/db/dbProducts';
import { dbRankCompanyPrice } from '/db/dbRankCompanyPrice';
import { dbRankCompanyProfit } from '/db/dbRankCompanyProfit';
import { dbRankCompanyValue } from '/db/dbRankCompanyValue';
import { dbRankUserWealth } from '/db/dbRankUserWealth';
import { dbRound } from '/db/dbRound';
import { dbRuleAgendas } from '/db/dbRuleAgendas';
import { dbSeason } from '/db/dbSeason';
import { dbTaxes } from '/db/dbTaxes';
import { dbUserArchive } from '/db/dbUserArchive';
import { dbValidatingUsers } from '/db/dbValidatingUsers';
import { dbVoteRecord } from '/db/dbVoteRecord';
import { pttUserFactory, companyFactory } from './factories';

function resetDatabase() {
  dbAdvertising.remove({});
  dbCompanies.remove({});
  dbCompanyArchive.remove({});
  dbDirectors.remove({});
  dbFoundations.remove({});
  dbLog.remove({});
  dbOrders.remove({});
  dbPrice.remove({});
  dbProducts.remove({});
  dbRankCompanyPrice.remove({});
  dbRankCompanyProfit.remove({});
  dbRankCompanyValue.remove({});
  dbRankUserWealth.remove({});
  dbRound.remove({});
  dbRuleAgendas.remove({});
  dbSeason.remove({});
  dbTaxes.remove({});
  dbUserArchive.remove({});
  dbValidatingUsers.remove({});
  dbVoteRecord.remove({});
}

if (Meteor.isServer && Meteor.isDevelopment) {
  module.exports.createSeedData = function({ reset } = {}) {
    console.log('createSeedData');

    if (reset) {
      console.log('reset database...');
      resetDatabase();
    }

    console.log('create users...');
    pttUserFactory.buildList(100).forEach((u) => {
      Accounts.createUser(u);
    });

    console.log('make user1 be admin...');
    Meteor.users.update({ username: 'user1' }, { $set: { 'profile.roles': 'superAdmin' } });

    console.log('create companies...');
    companyFactory.buildList(100).forEach((c) => {
      dbCompanies.insert(c);
    });

    console.log('make user1 be the manager of all companies...');
    setManagerOfAllCompanies(Meteor.users.find({ username: 'user1' }).fetch()[0]._id);

    console.log('randomly allocate stocks...');
    randomlyAllocateStocks();

    console.log('add companies to archive...');
    const companyArchiveBulk = dbCompanyArchive.rawCollection().initializeUnorderedBulkOp();
    dbCompanies
      .find({ isSeal: false })
      .forEach((companyData) => {
        companyArchiveBulk.insert({
          _id: companyData._id,
          status: 'market',
          companyName: companyData.companyName,
          tags: companyData.tags,
          pictureSmall: companyData.pictureSmall,
          pictureBig: companyData.pictureSmall,
          description: companyData.description
        });
      });
    companyArchiveBulk.execute();

    console.log('done');
  };
}

function setManagerOfAllCompanies(userId) {
  dbCompanies.update({}, {
    $set: {
      manager: userId,
      candidateList: [userId],
      voteList: [ [] ]
    }
  }, { multi: true });
}

function randomlyAllocateStocks() {
  dbCompanies
    .find({ isSeal: false })
    .fetch()
    .forEach(({ _id: companyId, totalRelease }) => {
      const users = Meteor.users.find().fetch();
      let notYetRelease = totalRelease - computeAlreadyRelease(companyId);
      while (notYetRelease > 0) {
        const userIndex = Math.floor(Math.random() * users.length);
        const userId = users[userIndex]._id;
        const stocks = users.length > 1 ? Math.floor(Math.random() * notYetRelease) + 1 : notYetRelease;
        const createdAt = new Date();
        dbDirectors.insert({ companyId, userId, stocks, createdAt });
        notYetRelease -= stocks;
        users.splice(userIndex, 1);
      }
    });
}

function computeAlreadyRelease(companyId) {
  return dbDirectors
    .find({ companyId })
    .fetch()
    .reduce((sum, { stocks }) => {
      return sum + stocks;
    }, 0);
}
