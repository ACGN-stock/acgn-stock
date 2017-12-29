import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  forfeitCompanyProfit({ companyId, reason, amount }) {
    check(this.userId, String);
    check(companyId, String);
    check(reason, String);
    check(amount, Match.Integer);
    forfeitCompanyProfit(Meteor.user(), { companyId, reason, amount });

    return true;
  }
});

function forfeitCompanyProfit(user, { companyId, reason, amount }) {
  debug.log('forfeitCompanyProfit', { user, companyId, reason, amount });

  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '您並非金融管理會委員，無法進行此操作！');
  }

  if (amount === 0) {
    throw new Meteor.Error(403, '罰金不得為 0！');
  }

  if (dbCompanies.find(companyId).count() < 1) {
    throw new Meteor.Error(404, `找不到識別碼為「${companyId}」的公司！`);
  }

  dbLog.insert({
    logType: amount > 0 ? '課以罰款' : '退還罰款',
    companyId: companyId,
    userId: [user._id],
    data: {
      reason,
      fine: Math.abs(amount)
    },
    createdAt: new Date()
  });

  dbCompanies.update(companyId, { $inc: { 'profit': -amount } });
}
