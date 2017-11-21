import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { resetDatabase } from 'meteor/xolvio:cleaner';

import { pttUserFactory, companyFactory } from './factories';
import { dbCompanies } from '/db/dbCompanies';
import { dbCompanyArchive } from '/db/dbCompanyArchive';

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
