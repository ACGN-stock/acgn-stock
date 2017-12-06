import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { publishTotalCount } from '/server/imports/utils/publishTotalCount';
import { buildSearchRegExp } from '/server/imports/utils/buildSearchRegExp';

Meteor.publish('companyArchiveList', function({keyword, matchType, offset}) {
  debug.log('publish companyArchiveList', {keyword, matchType, offset});
  check(keyword, String);
  check(matchType, new Match.OneOf('exact', 'fuzzy'));
  check(offset, Match.Integer);
  const filter = {
    status: 'archived'
  };
  if (keyword) {
    const regexp = buildSearchRegExp(keyword, matchType);
    filter.$or = [
      {
        name: regexp
      },
      {
        tags: regexp
      }
    ];
  }

  const totalCountObserver = publishTotalCount('totalCountOfCompanyArchiveList', dbCompanyArchive.find(filter), this);

  const pageObserver = dbCompanyArchive
    .find(filter, {
      sort: {
        createdAt: 1
      },
      skip: offset,
      limit: 12,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('companyArchive', id, fields);
      },
      changed: (id, fields) => {
        this.changed('companyArchive', id, fields);
      },
      removed: (id) => {
        this.removed('companyArchive', id);
      }
    });

  this.ready();
  this.onStop(() => {
    totalCountObserver.stop();
    pageObserver.stop();
  });
});
//一分鐘最多20次
limitSubscription('companyArchiveList');
