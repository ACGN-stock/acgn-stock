import { Meteor } from 'meteor/meteor';

import { limitSubscription } from '/server/imports/rateLimit';
import { debug } from '/server/imports/debug';

Meteor.publish('userFavorite', function() {
  debug.log('publish userFavorite');
  if (typeof this.userId === 'string') {
    return Meteor.users.find(this.userId, { favorite: 1 });
  }

  return [];
});
limitSubscription('userFavorite');
