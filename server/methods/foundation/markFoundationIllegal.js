import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbFoundations } from '/db/dbFoundations';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

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
  guardUser(user).checkHasRole('fscMember');
  dbFoundations.findByIdOrThrow(companyId, { fields: { _id: 1 } });
  dbFoundations.update(companyId, { $set: { illegalReason: reason } });
}
limitMethod('markFoundationIllegal');
