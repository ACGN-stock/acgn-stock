import { Meteor } from 'meteor/meteor';

import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('fscMembers', function() {
  debug.log('publish fscMembers');

  return Meteor.users.find({ 'profile.roles': 'fscMember' }, {
    fields: {
      'profile.roles': 1,
      createdAt: 1
    }
  });
});
limitSubscription('fscMembers');
