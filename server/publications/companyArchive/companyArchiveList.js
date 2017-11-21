import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { limitSubscription } from '/server/imports/rateLimit';
import { debug } from '/server/imports/debug';
import { publishTotalCount } from '/server/imports/publishTotalCount';

Meteor.publish('companyArchiveList', function(keyword, offset) {
  debug.log('publish companyArchiveList', {keyword, offset});
  check(keyword, String);
  check(offset, Match.Integer);
  const filter = {
    status: 'archived'
  };
  if (keyword) {
    keyword = keyword.replace(/\\/g, '\\\\');
    const reg = new RegExp(keyword, 'i');
    filter.$or = [
      {
        name: reg
      },
      {
        tags: reg
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
