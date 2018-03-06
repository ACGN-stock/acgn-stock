import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { _ } from 'meteor/underscore';

import { dbProducts } from '/db/dbProducts';
import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

const editableFields = ['productName', 'type', 'url', 'description'];

Meteor.methods({
  adminEditProduct({ productId, newData }) {
    check(this.userId, String);
    check(productId, String);
    check(newData, {
      productName: String,
      type: String,
      url: String,
      description: new Match.Maybe(String)
    });
    adminEditProduct({ userId: this.userId, productId, newData });

    return true;
  }
});

export function adminEditProduct({ userId, productId, newData }) {
  debug.log('adminEditProduct', { userId, productId, newData });

  const user = Meteor.users.findByIdOrThrow(userId);
  guardUser(user).checkIsAdmin();

  const { url } = newData;

  const product = dbProducts.findByIdOrThrow(productId);
  const { companyId } = product;
  const oldData = _.pick(product, ...editableFields);

  if (dbProducts.find({ companyId, url, _id: { $not: { $eq: productId } } }).count() > 0) {
    throw new Meteor.Error(403, '相同的產品已經被推出過了！');
  }

  dbProducts.update({ _id: productId }, { $set: newData });

  dbLog.insert({
    logType: '產品修正',
    userId: [userId],
    companyId,
    data: {
      productId,
      diff: productDiff(oldData, newData)
    },
    createdAt: new Date()
  });
}

function productDiff(oldData, newData) {
  return editableFields.reduce((diff, key) => {
    if (oldData[key] !== newData[key]) {
      diff[key] = { before: oldData[key], after: newData[key] };
    }

    return diff;
  }, {});
}
