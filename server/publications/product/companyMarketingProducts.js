import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { check, Match } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { dbProducts } from '/db/dbProducts';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';
import { debug } from '/server/imports/utils/debug';
import { publishWithTransformation } from '/server/imports/utils/publishWithTransformation';
import { hasRole } from '/db/users';

const MANAGER_ONLY_FIELDS = [
  'stockAmount',
  'totalAmount',
  'replenishBatchSizeType',
  'replenishBaseAmountType'
];

const ADMIN_ONLY_FIELDS = [
  'createdAt',
  'creator',
  'updatedAt',
  'updatedBy'
];

Meteor.publish('companyMarketingProducts', function({ companyId, offset }) {
  debug.log('publish companyMarketingProducts', { companyId, offset });
  check(companyId, String);
  check(offset, Match.Integer);

  const company = dbCompanies.findOne(companyId);

  const filter = { companyId, state: 'marketing' };

  publishTotalCount('totalCountOfCompanyMarketingProducts', dbProducts.find(filter), this);

  const { companyMarketingProducts: dataNumberPerPage } = Meteor.settings.public.dataNumberPerPage;

  const fields = {
    companyId: 1,
    seasonId: 1,
    state: 1,
    productName: 1,
    type: 1,
    rating: 1,
    description: 1,
    url: 1,
    voteCount: 1,
    price: 1,
    availableAmount: 1
  };

  MANAGER_ONLY_FIELDS.forEach((fieldName) => { // will be omitted later if necessary
    fields[fieldName] = 1;
  });

  const isCurrentUserFscMember = this.userId && hasRole(Meteor.users.findOne(this.userId), 'fscMember');
  const isCurrentUserManager = this.userId && this.userId === company.manager;

  if (isCurrentUserFscMember) {
    ADMIN_ONLY_FIELDS.forEach((fieldName) => {
      fields[fieldName] = 1;
    });
  }

  publishWithTransformation(this, {
    collection: 'products',
    cursor: dbProducts.find(filter, {
      fields,
      sort: { voteCount: -1 },
      skip: offset,
      limit: dataNumberPerPage
    }),
    transform: (fields) => {
      const result = { ...fields };

      if (fields.stockAmount) {
        result.hasStockAmount = fields.stockAmount > 0;
      }

      if (! isCurrentUserManager) {
        return _.omit(result, ...MANAGER_ONLY_FIELDS);
      }

      return result;
    }
  });

  this.ready();
});
// 一分鐘最多20次
limitSubscription('companyMarketingProducts');
