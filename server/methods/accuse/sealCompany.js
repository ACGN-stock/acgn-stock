import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { dbLog } from '/db/dbLog';
import { returnCompanyStones } from '/server/functions/miningMachine/returnCompanyStones';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

Meteor.methods({
  sealCompany({ companyId, message }) {
    check(this.userId, String);
    check(companyId, String);
    check(message, String);
    sealCompany(Meteor.user(), { companyId, message });

    return true;
  }
});
function sealCompany(user, { companyId, message }) {
  debug.log('sealCompany', { user, companyId, message });

  guardUser(user).checkHasRole('fscMember');

  const { isSeal } = dbCompanies.findByIdOrThrow(companyId, { fields: { isSeal: 1 } });

  dbLog.insert({
    logType: isSeal ? '解除查封' : '查封關停',
    userId: [user._id],
    companyId: companyId,
    data: { reason: message },
    createdAt: new Date()
  });
  dbCompanies.update(companyId, { $set: { isSeal: ! isSeal } });

  // 查封時歸還所有石頭
  if (! isSeal) {
    returnCompanyStones(companyId);
  }
}
