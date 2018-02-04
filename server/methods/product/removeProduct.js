import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbProducts } from '/db/dbProducts';
import { dbCompanies } from '/db/dbCompanies';
import { debug } from '/server/imports/utils/debug';
import { guardCompany, guardProduct } from '/common/imports/guards';

Meteor.methods({
  removeProduct(productId) {
    check(this.userId, String);
    check(productId, String);
    removeProduct(Meteor.user(), productId);

    return true;
  }
});
export function removeProduct(user, productId) {
  debug.log('removeProduct', { user, productId });

  const product = dbProducts.findByIdOrThrow(productId);

  guardProduct(product).checkInState('planning');

  const { companyId } = product;
  const company = dbCompanies.findByIdOrThrow(companyId, {
    fields: { companyName: 1, manager: 1, isSeal: 1 }
  });

  guardCompany(company).checkIsManagableByUser(user);

  resourceManager.throwErrorIsResourceIsLock(['season']);
  dbProducts.remove(productId);
}
