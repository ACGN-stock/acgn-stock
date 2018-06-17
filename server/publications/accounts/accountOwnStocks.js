import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';
import { publishWithScope } from '/server/imports/utils/publishWithScope';
import { dbDirectors } from '/db/dbDirectors';
import { dbCompanies } from '/db/dbCompanies';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('accountOwnStocks', function(userId, offset, { limit = 10, includeSeal = true } = {}) {
  debug.log('publish accountOwnStocks', { userId, offset, limit, includeSeal });
  check(userId, String);
  check(offset, Match.Integer);
  check(limit, Match.Integer);
  check(includeSeal, Boolean);

  this.autorun(() => {
    let filter;

    if (! includeSeal) {
      const companyList = dbCompanies.find({ isSeal: false })
        .map((company) => {
          return company._id;
        });

      filter = { userId, companyId: { $in: companyList } };
    }
    else {
      filter = { userId };
    }

    publishTotalCount('totalCountOfAccountOwnStocks', dbDirectors.find(filter), this);

    publishWithScope(this, {
      collection: 'directors',
      scope: 'user',
      cursor: dbDirectors.find(filter, {
        fields: {
          userId: 1,
          companyId: 1,
          stocks: 1
        },
        skip: offset,
        limit: limit,
        disableOplog: true
      })
    });

    this.ready();
  });
});

// 一分鐘最多20次
limitSubscription('accountOwnStocks');
