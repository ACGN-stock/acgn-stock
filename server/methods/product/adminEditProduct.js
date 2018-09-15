import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { _ } from 'meteor/underscore';

import { dbProducts } from '/db/dbProducts';
import { dbViolationCases } from '/db/dbViolationCases';
import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

const editableFields = ['productName', 'type', 'rating', 'url', 'description'];

Meteor.methods({
  adminEditProduct({ productId, newData, violationCaseId }) {
    check(this.userId, String);
    check(productId, String);
    check(newData, {
      productName: String,
      type: String,
      rating: String,
      url: String,
      description: new Match.Maybe(String)
    });
    check(violationCaseId, Match.Optional(String));

    adminEditProduct(Meteor.user(), { productId, newData, violationCaseId });

    return true;
  }
});

export function adminEditProduct(currentUser, { productId, newData, violationCaseId }) {
  debug.log('adminEditProduct', { currentUser, productId, newData, violationCaseId });

  guardUser(currentUser).checkHasRole('fscMember');

  const { url } = newData;

  const product = dbProducts.findByIdOrThrow(productId);
  const { companyId } = product;
  const oldData = _.pick(product, ...editableFields);

  if (dbProducts.find({ companyId, url, _id: { $not: { $eq: productId } } }).count() > 0) {
    throw new Meteor.Error(403, '相同的產品已經被推出過了！');
  }

  if (violationCaseId) {
    dbViolationCases.findByIdOrThrow(violationCaseId, { fields: { _id: 1 } });
  }

  const diff = productDiff(oldData, newData);

  if (_.isEmpty(diff)) {
    throw new Meteor.Error(403, '產品資料並沒有任何改變！');
  }

  dbProducts.update({ _id: productId }, { $set: newData });

  dbLog.insert({
    logType: '產品修正',
    userId: [currentUser._id],
    companyId,
    data: {
      productId,
      diff,
      violationCaseId
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
