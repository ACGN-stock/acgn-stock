'use strict';
import { Meteor } from 'meteor/meteor';
import { Migrations } from 'meteor/percolate:migrations';
import { dbCompanies } from './dbCompanies';
import { dbPrice } from './dbPrice';
import { dbDirectors } from './dbDirectors';
import { dbFoundations } from './dbFoundations';
import { dbInstantMessage } from './dbInstantMessage';
import { dbLog } from './dbLog';
import { dbOrders } from './dbOrders';
import { dbProducts } from './dbProducts';
import { dbSeason } from './dbSeason';
import { dbValidatingUsers } from './dbValidatingUsers';

if (Meteor.isServer) {
  Migrations.add({
    version: 1,
    name: 'Create indexes.',
    up() {
      dbCompanies.rawCollection().createIndex({
        companyName: 1
      }, {
        unique: true
      });
      dbCompanies.rawCollection().createIndex({
        manager: 1
      });
      dbCompanies.rawCollection().createIndex({
        tags: 1
      });
      dbCompanies.rawCollection().createIndex({
        lastPrice: -1
      });
      dbCompanies.rawCollection().createIndex({
        totalValue: -1
      });
      dbPrice.rawCollection().createIndex({
        companyName: 1,
        createdAt: -1
      });
      dbDirectors.rawCollection().createIndex({
        companyName: 1,
        username: 1
      }, {
        unique: true
      });
      dbDirectors.rawCollection().createIndex({
        username: 1
      });
      dbFoundations.rawCollection().createIndex({
        createdAt: 1
      });
      dbFoundations.rawCollection().createIndex({
        companyName: 1
      }, {
        unique: true
      });
      dbInstantMessage.rawCollection().createIndex({
        createdAt: -1
      });
      dbLog.rawCollection().createIndex({
        createdAt: -1
      });
      dbOrders.rawCollection().createIndex({
        username: 1
      });
      dbOrders.rawCollection().createIndex({
        orderType: 1,
        unitPrice: 1
      });
      dbProducts.rawCollection().createIndex({
        companyName: 1,
        url: 1
      }, {
        unique: true
      });
      dbProducts.rawCollection().createIndex({
        overdue: 1
      });
      dbValidatingUsers.rawCollection().createIndex({
        username: 1,
        password: 1
      }, {
        unique: true
      });
    }
  });
  Migrations.add({
    version: 2,
    name: 'log schma change for instant message.',
    up() {
      dbLog.update({}, {
        $set: {
          resolve: true
        }
      });
      dbLog.rawCollection().createIndex({
        resolve: 1
      });
    }
  });
  Migrations.add({
    version: 3,
    name: 'season data.',
    up() {
      dbSeason.rawCollection().createIndex({
        beginDate: -1
      });
    }
  });

  Meteor.startup(() => {
    Migrations.migrateTo('latest');
  });
}
