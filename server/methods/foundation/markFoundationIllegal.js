import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbFoundations } from '/db/dbFoundations';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  markFoundationIllegal(companyId, reason) {
    check(this.userId, String);
    check(companyId, String);
    check(reason, String);
    markFoundationIllegal(Meteor.user(), companyId, reason);

    return true;
  }
});
function markFoundationIllegal(user, companyId, reason) {
  debug.log('markFoundationIllegal', { user, companyId, reason });
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '您並非金融管理會委員，無法進行此操作！');
  }

  if (dbFoundations.find(companyId).count() === 0) {
    throw new Meteor.Error(404, '找不到要編輯的新創計劃，該新創計劃可能已經創立成功或失敗！');
  }

  dbFoundations.update(companyId, { $set: { illegalReason: reason } });
}
limitMethod('markFoundationIllegal');
