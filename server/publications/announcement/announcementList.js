import { _ } from 'meteor/underscore';
import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { Counts } from 'meteor/tmeasday:publish-counts';

import { dbAnnouncements, announcementCategoryMap } from '/db/dbAnnouncements';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('announcementList', function({ category, onlyUnread, offset }) {
  debug.log('publish announcementList', { category, onlyUnread, offset });

  check(category, Match.Optional(Match.OneOf(...Object.keys(announcementCategoryMap))));
  check(onlyUnread, Match.Optional(Boolean));
  check(offset, Match.Integer);

  const filter = {};

  if (category) {
    Object.assign(filter, { category });
  }

  if (this.userId && onlyUnread) {
    Object.assign(filter, { readers: { $ne: this.userId } });
  }

  Counts.publish(this, 'announcements', dbAnnouncements.find(filter, { fields: { _id: 1 } }), { noReady: true });

  const transformFields = (fields) => {
    const result = { ..._.omit(fields, 'readers') };

    if (this.userId && fields.readers) {
      result.isUnread = ! fields.readers.includes(this.userId);
    }

    return result;
  };

  const { announcements: dataNumberPerPage } = Meteor.settings.public.dataNumberPerPage;

  dbAnnouncements
    .find(filter, {
      fields: {
        creator: 1,
        category: 1,
        subject: 1,
        createdAt: 1,
        readers: 1
      },
      sort: { createdAt: -1 },
      skip: offset,
      limit: dataNumberPerPage
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('announcements', id, transformFields(fields));
      },
      changed: (id, fields) => {
        this.changed('announcements', id, transformFields(fields));
      },
      removed: (id) => {
        this.removed('announcements', id);
      }
    });

  this.ready();
});
// 一分鐘最多20次
limitSubscription('announcementList');
