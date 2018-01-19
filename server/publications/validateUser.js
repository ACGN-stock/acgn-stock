import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { limitSubscription } from '/server/imports/utils/rateLimit';
import { dbValidatingUsers } from '/db/dbValidatingUsers';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('validateUser', function(username) {
  debug.log('publish validateUser', username);
  check(username, String);

  const observer = dbValidatingUsers
    .find(
      { username: { $in: [username, `?${username}`] } },
      { disableOplog: true }
    )
    .observeChanges({
      added: (id, fields) => {
        this.added('validatingUsers', id, fields);
      },
      removed: (id) => {
        this.removed('validatingUsers', id);
        this.stop();
      }
    });

  this.onStop(() => {
    observer.stop();
  });
  this.ready();
});
// 一分鐘最多20次
limitSubscription('validateUser');
