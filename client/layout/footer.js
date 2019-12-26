import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Counts } from 'meteor/tmeasday:publish-counts';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { dbAdvertising } from '/db/dbAdvertising';
import { dbVariables } from '/db/dbVariables';
import { notificationCategories } from '/db/dbNotifications';
import { rMainTheme } from '../utils/styles';
import { shouldStopSubscribe } from '../utils/idle';

Template.footer.onCreated(function() {
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    this.subscribe('displayAdvertising');
  });
});

Template.footer.helpers({
  advertising() {
    const advertisingList = dbAdvertising
      .find({}, {
        sort: {
          paid: -1
        },
        limit: Meteor.settings.public.displayAdvertisingNumber
      })
      .fetch();
    const randomDisplayIndex = Math.floor(Math.random() * advertisingList.length);

    return advertisingList[randomDisplayIndex];
  },
  containerClass() {
    if (rMainTheme.get() === 'light') {
      return 'container container-light';
    }

    return 'container container-dark';
  }
});

Template.unreadImportantFscLogsNotification.onCreated(function() {
  this.rIsDisplay = new ReactiveVar(false);

  this.autorunWithIdleSupport(() => {
    this.rIsDisplay.set(Counts.get(`notification.${notificationCategories.FSC_LOG}`) > 0);
  });
});
Template.unreadImportantFscLogsNotification.helpers({
  isDisplay() {
    return Template.instance().rIsDisplay.get();
  }
});
Template.unreadImportantFscLogsNotification.events({
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

Template.displayAnnouncementUnreadNotification.onCreated(function() {
  this.rIsDisplay = new ReactiveVar(false);

  this.autorunWithIdleSupport(() => {
    this.rIsDisplay.set(Counts.get(`notification.${notificationCategories.ANNOUNCEMENT}`) > 0);
  });
});

Template.displayAnnouncementUnreadNotification.helpers({
  count() {
    return Counts.get(`notification.${notificationCategories.ANNOUNCEMENT}`);
  },
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

Template.displayViolationCaseUnreadNotification.onCreated(function() {
  this.rIsDisplay = new ReactiveVar(false);

  this.autorunWithIdleSupport(() => {
    this.rIsDisplay.set(Counts.get(`notification.${notificationCategories.VIOLATION_CASE}`) > 0);
  });
});

Template.displayViolationCaseUnreadNotification.helpers({
  count() {
    return Counts.get(`notification.${notificationCategories.VIOLATION_CASE}`);
  },
  isDisplay() {
    return Template.instance().rIsDisplay.get();
  },
  pathForUnreadViolationCaseList() {
    return FlowRouter.path('violationCaseList', null, { onlyUnread: true });
  }
});

Template.displayViolationCaseUnreadNotification.events({
  'click .btn'(event, templateInstance) {
    event.preventDefault();
    templateInstance.rIsDisplay.set(false);
  }
});
