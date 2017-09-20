'use strict';
import { _ } from 'meteor/underscore';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { dbAdvertising } from '../../db/dbAdvertising';
import { dbVariables } from '../../db/dbVariables';
import { config } from '../../config';
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
        limit: config.displayAdvertisingNumber
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

const rIsDisplayAnnouncement = new ReactiveVar(true);
Template.displayAnnouncement.onCreated(function() {
  this.autorun(() => {
    dbVariables.get('announcement');
    rIsDisplayAnnouncement.set(true);
  });
});
Template.displayAnnouncement.helpers({
  isDisplay() {
    return rIsDisplayAnnouncement.get() && dbVariables.get('announcement');
  },
  announcement() {
    return dbVariables.get('announcement');
  }
});
Template.displayAnnouncement.events({
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
