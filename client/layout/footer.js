import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Counts } from 'meteor/tmeasday:publish-counts';

import { dbAdvertising } from '/db/dbAdvertising';
import { dbVariables } from '/db/dbVariables';
import { rMainTheme } from '../utils/styles';
import { shouldStopSubscribe } from '../utils/idle';

Template.footer.onCreated(function() {
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    this.subscribe('onlinePeopleNumber');
    this.subscribe('displayAdvertising');
  });
});

const rClosedAdvertisingIdList = new ReactiveVar([]);
Template.footer.helpers({
  advertisingList() {
    const advertisingList = dbAdvertising
      .find({}, {
        sort: {
          paid: -1
        },
        limit: Meteor.settings.public.displayAdvertisingNumber
      })
      .fetch();
    const closedAdvertisingIdList = rClosedAdvertisingIdList.get();

    return _.reject(advertisingList, (advertisingData) => {
      return _.contains(closedAdvertisingIdList, advertisingData._id);
    });
  },
  onlinePeopleNumber() {
    return dbVariables.get('onlinePeopleNumber') || 0;
  },
  containerClass() {
    if (rMainTheme.get() === 'light') {
      return 'container container-light';
    }

    return 'container container-dark';
  }
});

Template.unreadImportantAccuseLogsNotification.onCreated(function() {
  this.rIsDisplay = new ReactiveVar(false);

  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return;
    }

    const user = Meteor.user();
    if (! user) {
      this.rIsDisplay.set(false);

      return;
    }

    this.subscribe('lastImportantAccuseLogDate');

    const lastImportantAccuseLogDate = dbVariables.get('lastImportantAccuseLogDate');

    if (! lastImportantAccuseLogDate) {
      this.rIsDisplay.set(false);

      return;
    }

    if (! user.status || ! user.profile.lastReadAccuseLogDate) {
      this.rIsDisplay.set(true);

      return false;
    }

    const lastReadAccuseLogDate = user.profile.lastReadAccuseLogDate;

    this.rIsDisplay.set(lastReadAccuseLogDate < lastImportantAccuseLogDate);
  });
});
Template.unreadImportantAccuseLogsNotification.helpers({
  isDisplay() {
    return Template.instance().rIsDisplay.get();
  }
});
Template.unreadImportantAccuseLogsNotification.events({
  'click .btn'(event, templateInstance) {
    event.preventDefault();
    templateInstance.rIsDisplay.set(false);
  }
});

const rIsDisplayAnnouncement = new ReactiveVar(true);
Template.displayLegacyAnnouncement.onCreated(function() {
  this.autorun(() => {
    dbVariables.get('announcement');
    rIsDisplayAnnouncement.set(true);
  });
});
Template.displayLegacyAnnouncement.helpers({
  isDisplay() {
    return rIsDisplayAnnouncement.get() && dbVariables.get('announcement');
  },
  announcement() {
    return dbVariables.get('announcement');
  }
});

Template.displayLegacyAnnouncement.events({
  'click .btn'(event) {
    event.preventDefault();
    rIsDisplayAnnouncement.set(false);
  }
});

Template.displayAdvertising.events({
  'click .btn'(event, templateInstance) {
    event.preventDefault();
    const closedAdvertisingIdList = rClosedAdvertisingIdList.get().slice();
    rClosedAdvertisingIdList.set(_.union(closedAdvertisingIdList, templateInstance.data._id));
  }
});

Template.displayAnnouncementUnreadNotification.onCreated(function() {
  this.rIsDisplay = new ReactiveVar(false);

  this.autorunWithIdleSupport(() => {
    const user = Meteor.user();
    if (! user) {
      return;
    }

    this.subscribe('currentUserUnreadAnnouncementCount');
  });

  this.autorunWithIdleSupport(() => {
    this.rIsDisplay.set(Counts.get('currentUserUnreadAnnouncements') > 0);
  });
});

Template.displayAnnouncementUnreadNotification.helpers({
  isDisplay() {
    return Template.instance().rIsDisplay.get();
  }
});

Template.displayAnnouncementUnreadNotification.events({
  'click .btn'(event, templateInstance) {
    event.preventDefault();
    templateInstance.rIsDisplay.set(false);
  }
});
