import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { dbProducts } from '/db/dbProducts';
import { dbLog } from '/db/dbLog';
import { dbUserOwnedProducts } from '/db/dbUserOwnedProducts';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

Meteor.methods({
  banProduct({ productId, message }) {
    check(this.userId, String);
    check(productId, String);
    check(message, String);
    banProduct({ userId: this.userId, productId, message });

    return true;
  }
});
function banProduct({ userId, productId, message }) {
  debug.log('banProduct', { userId, productId, message });

  const user = Meteor.users.findByIdOrThrow(userId);
  guardUser(user).checkIsAdmin();

  const { companyId, productName, profit } = dbProducts.findByIdOrThrow(productId);

  dbLog.insert({
    logType: '產品下架',
    userId: [user._id],
    companyId: companyId,
    data: {
      reason: message,
      productName: productName,
      profit
    },
    createdAt: new Date()
  });

  dbCompanies.update(companyId, { $inc: { profit: -profit } });
  dbProducts.remove(productId);
  dbUserOwnedProducts.remove({ productId });
}
