'use strict';
import { Meteor } from 'meteor/meteor';
import { Migrations } from 'meteor/percolate:migrations';

if (Meteor.isServer) {
  // Migrations.add({
  //   version: 1,
  //   name: 'Create indexes.',
  //   up() {

  //   },
  //   down() {

  //   }
  // });

  Meteor.startup(() => {
    Migrations.migrateTo('latest');
  });
}
