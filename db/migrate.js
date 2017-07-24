'use strict';
import { Meteor } from 'meteor/meteor';
import { Migrations } from 'meteor/percolate:migrations';
// import { dbCompanies } from './dbCompanies';

if (Meteor.isServer) {
  // Migrations.add({
  //   version: 1,
  //   name: 'Create indexes.',
  //   up() {
  //     dbCompanies.rawCollection().createIndex({
  //       name: 1
  //     }, {
  //       unique: true
  //     });
  //   }
  // });

  Meteor.startup(() => {
    Migrations.migrateTo('latest');
  });
}
