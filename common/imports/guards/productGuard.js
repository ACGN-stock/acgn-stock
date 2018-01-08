import { Meteor } from 'meteor/meteor';

import { productStateDescription } from '/db/dbProducts';

class ProductGuard {
  constructor(product) {
    this.product = product;
  }

  checkInState(state) {
    if (this.product.state !== state) {
      throw new Meteor.Error(401, `該產品目前並非${productStateDescription(state)}狀態！`);
    }

    return this;
  }

  checkHasAvailableAmount(amount = 1) {
    if (this.product.availableAmount < amount) {
      throw new Meteor.Error(403, '產品剩餘可購買數量不足！');
    }

    return this;
  }
}

export function guardProduct(product) {
  return new ProductGuard(product);
}
