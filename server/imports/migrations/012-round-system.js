import { Meteor } from 'meteor/meteor';

import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbCompanies } from '/db/dbCompanies';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { dbFoundations } from '/db/dbFoundations';
import { dbRound } from '/db/dbRound';
import { dbSeason } from '/db/dbSeason';
import { dbUserArchive } from '/db/dbUserArchive';

defineMigration({
  version: 12,
  name: 'round system',
  async up() {
    // 建立 indexes
    await Promise.all([
      dbRound.rawCollection().createIndex({ beginDate: -1 }),
      dbCompanyArchive.rawCollection().createIndex({ name: 1 }, { unique: true }),
      dbCompanyArchive.rawCollection().createIndex({ status: 1 }),
      dbUserArchive.rawCollection().createIndex({ name: 1, validateType: 1 }, { unique: true })
    ]);

    const { seasonTime, seasonNumberInRound } = Meteor.settings.public;

    // 若已有商業季度資料，則以目前第一個季度計算目前賽季資料
    const firstSeasonData = dbSeason.findOne({}, { sort: { beginDate: 1 } });
    if (firstSeasonData) {
      const beginDate = firstSeasonData.beginDate;
      beginDate.setMinutes(0, 0, 0);
      const roundTime = seasonTime * seasonNumberInRound;
      const endDate = new Date(beginDate.getTime() + roundTime);
      dbRound.insert({ beginDate, endDate });
    }

    // 建立上市公司的保管庫資料
    if (dbCompanies.find().count()) {
      const companyArchiveBulk = dbCompanyArchive.rawCollection().initializeUnorderedBulkOp();
      dbCompanies
        .find({})
        .forEach(({ _id: companyId, companyName, tags, pictureSmall, pictureBig, description }) => {
          companyArchiveBulk.insert({
            _id: companyId,
            status: 'market',
            name: companyName,
            tags,
            pictureSmall,
            pictureBig,
            description
          });
        });
      Meteor.wrapAsync(companyArchiveBulk.execute, companyArchiveBulk)();
    }

    // 建立新創公司的保管庫資料
    if (dbFoundations.find().count()) {
      const companyArchiveBulk = dbCompanyArchive.rawCollection().initializeUnorderedBulkOp();
      dbFoundations
        .find()
        .forEach(({ _id: companyId, companyName, tags, pictureSmall, pictureBig, description }) => {
          companyArchiveBulk.insert({
            _id: companyId,
            status: 'foundation',
            name: companyName,
            tags,
            pictureSmall,
            pictureBig,
            description
          });
        });
      Meteor.wrapAsync(companyArchiveBulk.execute, companyArchiveBulk)();
    }

    // 將 Google 帳號使用者的 profile.name 設定為 email
    const googleUserCursor = Meteor.users.find({ 'profile.validateType': 'Google' });
    if (googleUserCursor.count()) {
      const userBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();
      googleUserCursor.forEach(({ _id: userId, services }) => {
        userBulk
          .find({ _id: userId })
          .updateOne({ $set: { 'profile.name': services.google.email } });
      });
      Meteor.wrapAsync(userBulk.execute, userBulk)();
    }

    // 建立使用者的保管庫資料
    if (Meteor.users.find().count()) {
      const userArchiveBulk = dbUserArchive.rawCollection().initializeUnorderedBulkOp();
      Meteor.users.find().forEach(({ _id: userId, profile }) => {
        userArchiveBulk.insert({
          _id: userId,
          status: 'registered',
          name: profile.name,
          validateType: profile.validateType,
          isAdmin: profile.isAdmin,
          stone: profile.stones.saint,
          ban: profile.ban
        });
      });
      userArchiveBulk.execute();
    }
  }
});
