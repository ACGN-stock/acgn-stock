'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  accuseCompany(companyId, message) {
    check(this.userId, String);
    check(companyId, String);
    check(message, String);
    accuseCompany(Meteor.user(), companyId, message);

    return true;
  }
});
function accuseCompany(user, companyId, message) {
  debug.log('accuseCompany', {user, companyId, message});
  if (_.contains(user.profile.ban, 'accuse')) {
    throw new Meteor.Error(403, '您現在被金融管理會禁止了所有舉報違規行為！');
  }

  const companyData = dbCompanies.findOne(companyId);
  if (! companyData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + companyId + '」的公司！');
  }

  const userIds = [user._id];
  const { manager } = companyData;

  if (manager && manager !== '!none') {
    userIds[1] = manager;
  }

  dbLog.insert({
    logType: '舉報違規',
    userId: userIds,
    companyId,
    data: {
      reason: message
    },
    createdAt: new Date()
  });
}
