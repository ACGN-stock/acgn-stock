import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Counts } from 'meteor/tmeasday:publish-counts';

import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { dbOrders, orderTypeTranslateMap } from '/db/dbOrders';
import { publishWithScope } from '/server/imports/utils/publishWithScope';

Meteor.publish('companyOrders', function({ companyId, type, offset }) {
  debug.log('publish companyOrders', { companyId, type, offset });
  check(companyId, String);
  check(type, new Match.OneOf('buy', 'sell'));
  check(offset, Match.Integer);

  const filter = {
    companyId: companyId,
    orderType: orderTypeTranslateMap[type]
  };

  Counts.publish(this, `${type}Orders`, dbOrders.find(filter, { fields: { _id: 1 } }), { noReady: true });

  publishWithScope(this, {
    collection: 'orders',
    cursor: dbOrders.find(filter, {
      sort: { unitPrice: type === 'sell' ? 1 : -1 },
      skip: offset,
      limit: Meteor.settings.public.dataNumberPerPage.companyOrders
    }),
    scope: type
  });

  this.ready();
});
// 一分鐘最多20次
limitSubscription('companyOrders');
