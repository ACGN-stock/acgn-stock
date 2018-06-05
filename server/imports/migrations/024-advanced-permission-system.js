import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';

import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbUserArchive } from '/db/dbUserArchive';

defineMigration({
  version: 24,
  name: 'advanced permission system',
  async up() {
    // 廢除舊的 isAdmin 旗標，改用新的權限組設定並指定為金管會成員
    const fscMembers = _.pluck(Meteor.users.find({ 'profile.isAdmin': true }, { fields: { _id: 1 } }).fetch(), '_id');

    await Meteor.users.rawCollection().update({}, {
      $unset: { 'profile.isAdmin': 0 },
      $set: { 'profile.roles': [] }
    }, { multi: true });

    await Meteor.users.rawCollection().update({
      _id: { $in: fscMembers }
    }, {
      $addToSet: { 'profile.roles': 'fscMember' }
    }, { multi: true });

    // 處理使用者保管庫的金管會權限設定
    const archivedFscMembers = _.pluck(dbUserArchive.find({ isAdmin: true }, { fields: { _id: 1 } }).fetch(), '_id');

    await dbUserArchive.rawCollection().update({}, {
      $unset: { isAdmin: 0 },
      $set: { roles: [] }
    }, { multi: true });

    await dbUserArchive.rawCollection().update({
      _id: { $in: archivedFscMembers }
    }, {
      $addToSet: { roles: 'fscMember' }
    }, { multi: true });

    // 對權限組設定建立索引
    await Meteor.users.rawCollection().createIndex({ roles: 1 });
  }
});
