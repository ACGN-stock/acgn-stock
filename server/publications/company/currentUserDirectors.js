import { Meteor } from 'meteor/meteor';

import { dbDirectors } from '/db/dbDirectors';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('currentUserDirectors', function() {
  debug.log('publish currentUserDirectors');
  const userId = this.userId;
  if (userId) {
    return dbDirectors.find({ userId });
  }

  return [];
});
// 一分鐘最多20次
limitSubscription('currentUserDirectors');
