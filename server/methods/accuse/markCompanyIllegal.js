import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { dbLog } from '/db/dbLog';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

Meteor.methods({
  markCompanyIllegal(companyId, reason) {
    check(this.userId, String);
    check(companyId, String);
    check(reason, String);
    markCompanyIllegal(Meteor.user(), companyId, reason);

    return true;
  }
});
function markCompanyIllegal(user, companyId, reason) {
  debug.log('markCompanyIllegal', { user, companyId, reason });

  guardUser(user).checkHasRole('fscMember');

  dbCompanies.findByIdOrThrow(companyId, { fields: { _id: 1 } });

  dbCompanies.update(companyId, { $set: { illegalReason: reason } });
  dbLog.insert({
    logType: '違規標記',
    userId: [user._id],
    companyId,
    data: { reason },
    createdAt: new Date()
  });
}
limitMethod('markCompanyIllegal');
