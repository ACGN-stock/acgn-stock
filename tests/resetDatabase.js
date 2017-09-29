'use strict';
import { dbAdvertising } from '../db/dbAdvertising';
import { dbCompanies } from '../db/dbCompanies';
import { dbDirectors } from '../db/dbDirectors';
import { dbFoundations } from '../db/dbFoundations';
import { dbLog } from '../db/dbLog';
import { dbOrders } from '../db/dbOrders';
import { dbPrice } from '../db/dbPrice';
import { dbProducts } from '../db/dbProducts';
import { dbProductLike } from '../db/dbProductLike';
import { dbRankCompanyPrice } from '../db/dbRankCompanyPrice';
import { dbRankCompanyProfit } from '../db/dbRankCompanyProfit';
import { dbRankCompanyValue } from '../db/dbRankCompanyValue';
import { dbRankUserWealth } from '../db/dbRankUserWealth';
import { dbResourceLock } from '../db/dbResourceLock';
import { dbSeason } from '../db/dbSeason';
import { dbValidatingUsers } from '../db/dbValidatingUsers';
import { dbVoteRecord } from '../db/dbVoteRecord';
import { Meteor } from 'meteor/meteor';

Meteor.startup(function() {
  dbAdvertising.remove({});
  dbCompanies.remove({});
  dbDirectors.remove({});
  dbFoundations.remove({});
  dbLog.remove({});
  dbOrders.remove({});
  dbPrice.remove({});
  dbProducts.remove({});
  dbResourceLock.remove({});
  dbSeason.remove({});
  dbValidatingUsers.remove({});
  dbProductLike.remove({});
  dbRankCompanyPrice.remove({});
  dbRankCompanyProfit.remove({});
  dbRankCompanyValue.remove({});
  dbRankUserWealth.remove({});
  Meteor.users.update(
    {},
    {
      $inc: {
        'profile.stone': 1
      },
      $set: {
        'profile.money': 10000
      }
    },
    {
      multi: true
    }
  );
  dbVoteRecord.remove({});
  const date1 = new Date();
  const date2 = new Date(date1.getTime() + 1);
  Meteor.users.find({}).forEach((user) => {
    const userId = user._id;
    console.log('re-insert log data of userId[' + userId + ']...');
    dbLog.insert({
      logType: '驗證通過',
      userId: [userId],
      price: 10000,
      createdAt: date1
    });
    dbLog.insert({
      logType: '免費得石',
      userId: [userId],
      amount: user.profile.stone,
      message: '之前協助公測累積的石頭總數',
      createdAt: date2
    });
  });
  console.log('reset database done!');
});
