import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbProducts } from '/db/dbProducts';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

const scope = 'productCenterInfo';

Meteor.publish('companyProductCenterInfo', function(companyId) {
  debug.log('publish companyProductCenterInfo', companyId);

  check(companyId, String);

  let planningProductCount = 0;
  this.added('companies', companyId, { [`${scope}.planningProductCount`]: planningProductCount });

  const increasePlanningProductCount = (increment) => {
    planningProductCount += increment;
    this.changed('companies', companyId, { [`${scope}.planningProductCount`]: planningProductCount });
  };

  const planningProductCountObserver = dbProducts
    .find({ companyId, state: 'planning' }, { fields: { _id: 1 } })
    .observeChanges({
      added: () => {
        increasePlanningProductCount(1);
      },
      removed: () => {
        increasePlanningProductCount(-1);
      }
    });

  this.ready();

  this.onStop(() => {
    planningProductCountObserver.stop();
  });
});

limitSubscription('companyProductCenterInfo');
