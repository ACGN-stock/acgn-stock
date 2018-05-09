import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbFoundations } from '/db/dbFoundations';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { dbLog } from '/db/dbLog';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

Meteor.methods({
  changeFoundCompanyName(companyId, newCompanyName) {
    check(this.userId, String);
    check(companyId, String);
    check(newCompanyName, String);
    changeFoundCompanyName(Meteor.user(), companyId, newCompanyName);

    return true;
  }
});
function changeFoundCompanyName(user, companyId, newCompanyName) {
  debug.log('changeFoundCompanyName', { user, companyId, newCompanyName });

  guardUser(user).checkHasRole('fscMember');

  const { companyName: oldCompanyName } = dbFoundations.findByIdOrThrow(companyId, { fields: { companyName: 1 } });

  dbLog.insert({
    logType: '公司更名',
    userId: [user._id],
    companyId: companyId,
    data: { oldCompanyName, newCompanyName },
    createdAt: new Date()
  });
  dbFoundations.update(companyId, { $set: { companyName: newCompanyName } });
  dbCompanyArchive.update(companyId, { $set: { name: newCompanyName } });
}
limitMethod('changeFoundCompanyName');
