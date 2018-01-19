import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { dbEmployees } from '/db/dbEmployees';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';

Meteor.publish('accountChairmanTitle', function(userId, offset) {
  debug.log('publish accountChairmanTitle', {userId, offset});
  check(userId, String);
  check(offset, Match.Integer);

  const filter = {chairman: userId, isSeal: false};

  publishTotalCount('totalCountOfChairmanTitle', dbCompanies.find(filter), this);

  const pageObserver = dbCompanies
    .find(filter, {
      skip: offset,
      limit: 10,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('companies', id, fields);
      },
      changed: (id, fields) => {
        this.changed('companies', id, fields);
      },
      removed: (id) => {
        this.removed('companies', id);
      }
    });

  this.ready();
  this.onStop(() => {
    pageObserver.stop();
  });
});
//一分鐘最多20次
limitSubscription('accountChairmanTitle');

Meteor.publish('accountManagerTitle', function(userId, offset) {
  debug.log('publish accountManagerTitle', {userId, offset});
  check(userId, String);
  check(offset, Match.Integer);

  const filter = {manager: userId, isSeal: false};

  publishTotalCount('totalCountOfManagerTitle', dbCompanies.find(filter), this);

  const pageObserver = dbCompanies
    .find(filter, {
      skip: offset,
      limit: 10,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('companies', id, fields);
      },
      changed: (id, fields) => {
        this.changed('companies', id, fields);
      },
      removed: (id) => {
        this.removed('companies', id);
      }
    });

  this.ready();
  this.onStop(() => {
    pageObserver.stop();
  });
});
//一分鐘最多20次
limitSubscription('accountManagerTitle');

Meteor.publish('accounEmployeeTitle', function(userId) {
  debug.log('publish accounEmployeeTitle', {userId});
  check(userId, String);

  const filter = {userId, resigned: false};

  return [
    dbEmployees.find(filter),
    dbCompanies.find({
      '_id': {
        '$in': dbEmployees.find(filter).map((companyData) => {
          return companyData.companyId;
        })
      }
    })
  ];
});
//一分鐘最多20次
limitSubscription('accounEmployeeTitle');
