import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbOrders } from '/db/dbOrders';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';

Meteor.publish('companyOrderExcludeMe', function(companyId, type, offset) {
  debug.log('publish companyOrderExcludeMe', {companyId, type, offset});
  check(companyId, String);
  check(type, new Match.OneOf('購入', '賣出'));
  check(offset, Match.Integer);

  const filter = {
    companyId: companyId,
    orderType: type
  };
  const userId = this.userId;
  if (userId) {
    filter.userId = {
      $ne: userId
    };
  }

  const variableId = 'totalCountOfCompanyOrder' + type;

  const totalCountObserver = publishTotalCount(variableId, dbOrders.find(filter), this);

  const pageObserver = dbOrders
    .find(filter, {
      sort: { unitPrice: type === '賣出' ? 1 : -1 },
      skip: offset,
      limit: 10,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('orders', id, fields);
      },
      changed: (id, fields) => {
        this.changed('orders', id, fields);
      },
      removed: (id) => {
        this.removed('orders', id);
      }
    });

  this.ready();
  this.onStop(() => {
    totalCountObserver.stop();
    pageObserver.stop();
  });
});
//一分鐘最多20次
limitSubscription('companyOrderExcludeMe');
