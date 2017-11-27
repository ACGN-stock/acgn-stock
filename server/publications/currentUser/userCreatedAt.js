import { Meteor } from 'meteor/meteor';

import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('userCreatedAt', function() {
  debug.log('publish userCreatedAt');
  if (typeof this.userId === 'string') {
    return Meteor.users.find(this.userId, { createdAt: 1 });
  }

  return [];
});
limitSubscription('userCreatedAt');
