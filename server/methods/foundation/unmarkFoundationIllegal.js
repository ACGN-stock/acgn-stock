import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbFoundations } from '/db/dbFoundations';
import { limitMethod } from '/server/imports/rateLimit';
import { debug } from '/server/imports/debug';

Meteor.methods({
  unmarkFoundationIllegal(companyId) {
    check(this.userId, String);
    check(companyId, String);
    unmarkFoundationIllegal(Meteor.user(), companyId);

    return true;
  }
});
function unmarkFoundationIllegal(user, companyId) {
  debug.log('unmarkFoundationIllegal', {user, companyId});
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '您並非金融管理會委員，無法進行此操作！');
  }

  if (dbFoundations.find(companyId).count() === 0) {
    throw new Meteor.Error(404, '找不到要編輯的新創計劃，該新創計劃可能已經創立成功或失敗！');
  }

  dbFoundations.update(companyId, { $unset: { illegalReason: 1 } });
}
limitMethod('unmarkFoundationIllegal');
