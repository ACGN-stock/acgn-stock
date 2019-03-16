import { Tracker } from 'meteor/tracker';
import { Meteor } from 'meteor/meteor';

Meteor.subscribe('variables');
Meteor.subscribe('isChangingSeason');

Tracker.autorun(() => {
  const user = Meteor.user();

  if (! user) {
    return;
  }

  Meteor.subscribe('currentUserDirectors');
  Meteor.subscribe('currentUserOrders');
  Meteor.subscribe('currentUserNotificationCounts');
});
