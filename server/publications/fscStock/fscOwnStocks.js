import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';
import { dbDirectors } from '/db/dbDirectors';
import { dbCompanies } from '/db/dbCompanies';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('fscOwnStocks', function(userId, offset) {
  debug.log('publish fscOwnStocks', {userId, offset});
  check(userId, String);
  check(offset, Match.Integer);

  this.autorun(() => {
    const companyList = dbCompanies.find({isSeal: false})
      .map((company) => {
        return company._id;
      });

    const filter = { userId, companyId: { $in: companyList } };

    publishTotalCount('totalCountOfFSCOwnStocks', dbDirectors.find(filter), this);

    return dbDirectors
      .find(filter, {
        fields: {
          userId: 1,
          companyId: 1,
          stocks: 1
        },
        skip: offset,
        limit: 10,
        disableOplog: true
      });
  });
});
// 一分鐘最多20次
limitSubscription('fscOwnStocks');
