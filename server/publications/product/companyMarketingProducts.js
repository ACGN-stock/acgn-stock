import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbProducts } from '/db/dbProducts';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('companyMarketingProducts', function({ companyId, offset }) {
  debug.log('publish companyMarketingProducts', { companyId, offset });
  check(companyId, String);
  check(offset, Match.Integer);


  const filter = { companyId, state: 'marketing' };

  publishTotalCount('totalCountOfCompanyMarketingProducts', dbProducts.find(filter), this);

  const { companyMarketingProducts: dataNumberPerPage } = Meteor.settings.public.dataNumberPerPage;

  return dbProducts.find(filter, {
    sort: { voteCount: -1 },
    skip: offset,
    limit: dataNumberPerPage
  });
});
// 一分鐘最多20次
limitSubscription('companyMarketingProducts');
