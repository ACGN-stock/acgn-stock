'use strict';
import { dbCompanies } from '../db/dbCompanies';
import { dbDebugger } from '../db/dbDebugger';
import { dbDirectors } from '../db/dbDirectors';
import { dbFoundations } from '../db/dbFoundations';
import { dbInstantMessage } from '../db/dbInstantMessage';
import { dbLog } from '../db/dbLog';
import { dbOrders } from '../db/dbOrders';
import { dbPrice } from '../db/dbPrice';
// import { dbProducts } from '../db/dbProducts';
import { dbResourceLock } from '../db/dbResourceLock';
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
  dbCompanies.remove({});
  dbDebugger.remove({});
  dbDirectors.remove({});
  dbFoundations.find().forEach((foundationData) => {
    const companyName = foundationData.companyName;
    if (dbFoundations.find({companyName}).count() > 1) {
      console.log('remove foundations[' + companyName + '] because have same name foundations.');
      dbFoundations.remove(foundationData._id);
    }
    else if (typeof foundationData._id !== 'string') {
      console.log('re insert foundations[' + companyName + '] because have incrorect _id.');
      dbFoundations.remove(foundationData._id);
      dbFoundations.insert({
        companyName: companyName,
        manager: foundationData.manager,
        tags: foundationData.tags,
        pictureSmall: foundationData.pictureSmall,
        pictureBig: foundationData.pictureBig,
        description: foundationData.description,
        invest: [],
        createdAt: now
      });
    }
  });
  dbFoundations.update(
    {},
    {
      $set: {
        invest: [],
        createdAt: now
      }
    },
    {
      multi: true
    }
  );
  dbInstantMessage.remove({});
  Meteor.users.find().forEach((userData) => {
    const logData = dbLog.findOne({
      username: userData.username,
      logType: {
        $nin: ['驗證通過', '創立成功', '創立失敗', '創立得股']
      }
    });
    if (logData) {
      console.log('find user[' + userData.username + '] log data of type[' + logData.logType + '], increase stone by 1.');
      Meteor.users.update(userData._id, {
        $inc: {
          'profile.stone': 1
        }
      });
    }
    else {
      console.log('user[' + userData.username + '] don\'t have log data.');
    }
  });
  dbLog.remove({
    logType: {
      $ne: '驗證通過'
    }
  });
  dbOrders.remove({});
  dbPrice.remove({});
  dbResourceLock.remove({});
  dbValidatingUsers.remove({});
  Meteor.users.update({}, {
    $set: {
      'profile.money': 10000
    }
  }, {
    multi: true
  });
});
