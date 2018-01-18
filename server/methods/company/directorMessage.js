import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbDirectors } from '/db/dbDirectors';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  directorMessage(companyId, message) {
    check(this.userId, String);
    check(companyId, String);
    check(message, String);
    directorMessage(Meteor.user(), companyId, message);

    return true;
  }
});
function directorMessage(user, companyId, message) {
  debug.log('directorMessage', { user, companyId, message });
  const userId = user._id;
  const directorData = dbDirectors.findOne({ companyId, userId }, {
    fields: {
      _id: 1
    }
  });
  if (! directorData) {
    throw new Meteor.Error(401, '使用者並未持有該公司的股票，無法進行董事留言！');
  }
  dbDirectors.update(directorData._id, {
    $set: {
      message: message
    }
  });
}
