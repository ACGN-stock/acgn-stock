import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbLog } from '/db/dbLog';
import { dbCompanies } from '/db/dbCompanies';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

Meteor.methods({
  unmarkCompanyIllegal(companyId) {
    check(this.userId, String);
    check(companyId, String);
    unmarkCompanyIllegal(Meteor.user(), companyId);

    return true;
  }
});
function unmarkCompanyIllegal(user, companyId) {
  debug.log('unmarkCompanyIllegal', { user, companyId });

  guardUser(user).checkHasRole('fscMember');

  dbCompanies.findByIdOrThrow(companyId, { fields: { _id: 1 } });

  dbCompanies.update(companyId, { $unset: { illegalReason: 1 } });
  dbLog.insert({
    logType: '違規解標',
    userId: [user._id],
    companyId,
    createdAt: new Date()
  });
}
limitMethod('unmarkCompanyIllegal');
