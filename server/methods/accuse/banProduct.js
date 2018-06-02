import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { dbProducts } from '/db/dbProducts';
import { dbViolationCases } from '/db/dbViolationCases';
import { dbLog } from '/db/dbLog';
import { dbUserOwnedProducts } from '/db/dbUserOwnedProducts';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

Meteor.methods({
  banProduct({ productId, reason, violationCaseId }) {
    check(this.userId, String);
    check(productId, String);
    check(reason, String);
    check(violationCaseId, Match.Optional(String));

    banProduct(Meteor.user(), { productId, reason, violationCaseId });

    return true;
  }
});
function banProduct(currentUser, { productId, reason, violationCaseId }) {
  debug.log('banProduct', { currentUser, productId, reason, violationCaseId });

  guardUser(currentUser).checkHasRole('fscMember');

  const { companyId, productName, profit } = dbProducts.findByIdOrThrow(productId);

  if (violationCaseId) {
    dbViolationCases.findByIdOrThrow(violationCaseId, { fields: { _id: 1 } });
  }

  dbLog.insert({
    logType: '產品下架',
    userId: [currentUser._id],
    companyId,
    data: {
      reason,
      productName: productName,
      profit,
      violationCaseId
    },
    createdAt: new Date()
  });

  dbCompanies.update(companyId, { $inc: { profit: -profit } });
  dbProducts.remove(productId);
  dbUserOwnedProducts.remove({ productId });
}
