import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbCompanies } from '/db/dbCompanies';
import { dbDirectors } from '/db/dbDirectors';
import { dbOrders } from '/db/dbOrders';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';
import { buildSearchRegExp } from '/server/imports/utils/buildSearchRegExp';

Meteor.publish('companyList', function({ keyword, matchType, onlyShow, sortBy, offset }) {
  debug.log('publish companyList', { keyword, matchType, onlyShow, sortBy, offset });
  check(keyword, String);
  check(matchType, new Match.OneOf('exact', 'fuzzy', 'regexp'));
  check(onlyShow, new Match.OneOf('none', 'mine', 'favorite', 'order'));
  check(sortBy, new Match.OneOf('lastPrice', 'totalValue', 'capital', 'createdAt'));
  check(offset, Match.Integer);

  const filter = {
    isSeal: false
  };

  if (keyword) {
    const regexp = buildSearchRegExp(keyword, matchType);
    filter.$or = [
      {
        companyName: regexp
      },
      {
        tags: regexp
      }
    ];
  }

  const userId = this.userId;
  if (userId) {
    if (onlyShow === 'mine') {
      const seeCompanyIdList = dbDirectors
        .find({ userId }, {
          fields: {
            companyId: 1
          }
        })
        .map((directorData) => {
          return directorData.companyId;
        });
      const seeCompanyIdSet = new Set(seeCompanyIdList);
      dbOrders
        .find({ userId }, {
          fields: {
            companyId: 1
          }
        })
        .forEach((orderData) => {
          seeCompanyIdSet.add(orderData.companyId);
        });

      filter._id = {
        $in: [...seeCompanyIdSet]
      };
    }
    else if (onlyShow === 'favorite') {
      filter._id = {
        $in: Meteor.user().favorite
      };
    }
    else if (onlyShow === 'order') {
      const seeCompanyIdList = dbOrders
        .find({ userId }, {
          fields: {
            companyId: 1
          }
        })
        .map((orderData) => {
          return orderData.companyId;
        });
      const seeCompanyIdSet = new Set(seeCompanyIdList);
      filter._id = {
        $in: [...seeCompanyIdSet]
      };
    }
  }
  const sort = {
    [sortBy]: -1
  };
  const skip = offset;
  const limit = 12;
  const fields = {
    _id: 1,
    companyName: 1,
    founder: 1,
    manager: 1,
    chairmanTitle: 1,
    chairman: 1,
    pictureSmall: 1,
    illegalReason: 1,
    totalRelease: 1,
    lastPrice: 1,
    listPrice: 1,
    profit: 1,
    capital: 1,
    totalValue: 1,
    createdAt: 1,
    employeeBonusRatePercent: 1,
    managerBonusRatePercent: 1,
    capitalIncreaseRatePercent: 1
  };
  const disableOplog = true;

  publishTotalCount('totalCountOfCompanyList', dbCompanies.find(filter), this);
  const pageObserver = dbCompanies
    .find(filter, { sort, skip, limit, fields, disableOplog })
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
// 一分鐘最多20次
limitSubscription('companyList');
