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
import { dbProductLike } from '/db/dbProductLike';
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
  dbProductLike.remove({});
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
    Meteor.users.update({ username: 'user1' }, { $set: { 'profile.isAdmin': true } });

    console.log('create companies...');
    companyFactory.buildList(100).forEach((c) => {
      dbCompanies.insert(c);
    });

    console.log('add companies to archive...');
    const companyArchiveBulk = dbCompanyArchive.rawCollection().initializeUnorderedBulkOp();
    dbCompanies
      .find({ isSeal: false })
      .forEach((companyData) => {
        companyArchiveBulk.insert({
          _id: companyData._id,
          status: 'market',
          name: companyData.companyName,
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
