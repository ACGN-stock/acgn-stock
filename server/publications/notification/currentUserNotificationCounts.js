import { Meteor } from 'meteor/meteor';
import { Counts } from 'meteor/tmeasday:publish-counts';

import { limitSubscription } from '/server/imports/utils/rateLimit';
import { dbNotifications, notificationCategories } from '/db/dbNotifications';

Meteor.publish('currentUserNotificationCounts', function() {
  if (! this.userId) {
    return [];
  }

  Object.values(notificationCategories).forEach((category) => {
    Counts.publish(this, `notification.${category}`,
      dbNotifications.find(
        { category, targetUser: this.userId },
        { fields: { _id: 0 } }
      ),
      { noReady: true });
  });

  this.ready();
});

limitSubscription('currentUserNotificationCounts');
