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
import { Meteor } from 'meteor/meteor';

Meteor.startup(function() {
  const now = new Date();
  dbCompanies.find().forEach((companyData) => {
    const companyName = companyData.companyName;
    if (dbFoundations.findOne({companyName})) {
      console.log('not insert company[' + companyName + '] because alread have in foundations.');
    }
    else {
      console.log('insert company[' + companyName + '] back into foundations.');
      dbFoundations.insert({
        companyName: companyName,
        manager: companyData.manager,
        tags: companyData.tags,
        pictureSmall: companyData.pictureSmall,
        pictureBig: companyData.pictureBig,
        description: companyData.description,
        invest: [],
        createdAt: now
      });
    }
  });
  dbAdvertising.remove({});
  dbCompanies.remove({});
  dbDirectors.remove({});
  const startFoundationTime = 1503547200000;
  dbFoundations
    .find({}, {
      field: {
        _id: 1,
        manager: 1
      }
    })
    .forEach((foundationData, index) => {
      const timeDiff = 3900000 * Math.floor(index / 10);
      const createdAt = new Date(startFoundationTime + timeDiff);
      console.log('update foundation created at: ' + createdAt);
      dbFoundations.update(foundationData._id, {
        $set: {
          createdAt: createdAt
        }
      });
    });
  dbFoundations.update(
    {},
    {
      $set: {
        invest: []
      }
    },
    {
      multi: true
    }
  );
  let stoneCount = 0;
  Meteor.users.find().forEach((userData) => {
    const userId = userData._id;
    const logDataCursor = dbLog.find({
      userId: userId,
      logType: {
        $nin: ['驗證通過', '發薪紀錄', '創立成功', '創立失敗', '創立得股', '創立退款', '免費得石']
      }
    });
    if (logDataCursor.count() > 0) {
      console.log('find user[' + userId + '] log data, increase stone by 1.');
      Meteor.users.update(userId, {
        $inc: {
          'profile.stone': 1
        }
      });
      stoneCount += 1;
    }
    else {
      console.log('user[' + userData.username + '] don\'t have log data.');
    }
  });
  console.log('total give ' + stoneCount + ' stones to ' + stoneCount + ' users!');
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
      $set: {
        'profile.money': 10000
      }
    },
    {
      multi: true
    }
  );
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
  Meteor.users.update(
    {},
    {
      $unset: {
        'profile.revokeQualification': ''
      }
    },
    {
      multi: true
    }
  );
  console.log('reset database done!');
});
