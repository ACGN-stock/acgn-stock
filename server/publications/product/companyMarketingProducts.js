import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { check, Match } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { dbProducts } from '/db/dbProducts';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';
import { debug } from '/server/imports/utils/debug';
import { publishWithTransformation } from '/server/imports/utils/publishWithTransformation';

Meteor.publish('companyMarketingProducts', function({ companyId, offset }) {
  debug.log('publish companyMarketingProducts', { companyId, offset });
  check(companyId, String);
  check(offset, Match.Integer);

  const company = dbCompanies.findOne(companyId);

  const filter = { companyId, state: 'marketing' };

  publishTotalCount('totalCountOfCompanyMarketingProducts', dbProducts.find(filter), this);

  const { companyMarketingProducts: dataNumberPerPage } = Meteor.settings.public.dataNumberPerPage;

  publishWithTransformation(this, {
    collection: 'products',
    cursor: dbProducts.find(filter, {
      sort: { voteCount: -1 },
      skip: offset,
      limit: dataNumberPerPage
    }),
    transform: (fields) => {
      const result = { ...fields };

      if (fields.stockAmount) {
        result.hasStockAmount = fields.stockAmount > 0;
      }

      if (! this.userId || this.userId !== company.manager) {
        return _.omit(result, 'stockAmount', 'totalAmount');
      }

      return result;
    }
  });

  this.ready();
});
// 一分鐘最多20次
limitSubscription('companyMarketingProducts');
