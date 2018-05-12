import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbFoundations } from '/db/dbFoundations';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

Meteor.methods({
  unmarkFoundationIllegal(companyId) {
    check(this.userId, String);
    check(companyId, String);
    unmarkFoundationIllegal(Meteor.user(), companyId);

    return true;
  }
});
function unmarkFoundationIllegal(user, companyId) {
  debug.log('unmarkFoundationIllegal', { user, companyId });
  guardUser(user).checkHasRole('fscMember');
  dbFoundations.findByIdOrThrow(companyId, { fields: { _id: 1 } });
  dbFoundations.update(companyId, { $unset: { illegalReason: 1 } });
}
limitMethod('unmarkFoundationIllegal');
