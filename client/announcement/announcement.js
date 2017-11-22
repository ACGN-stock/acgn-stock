'use strict';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbRound } from '/db/dbRound';
import { dbSeason } from '/db/dbSeason';
import { dbVariables } from '/db/dbVariables';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { formatDateText } from '../utils/helpers';
import { shouldStopSubscribe } from '../utils/idle';

inheritedShowLoadingOnSubscribing(Template.announcement);
const rInEditAnnouncementMode = new ReactiveVar(false);
Template.announcement.onCreated(function() {
  rInEditAnnouncementMode.set(false);
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    this.subscribe('announcementDetail');
    this.subscribe('currentRound');
    this.subscribe('currentSeason');
  });
});
Template.announcement.helpers({
  getTutorialHref() {
    return FlowRouter.path('tutorial');
  },
  inEditAnnouncementMode() {
    return rInEditAnnouncementMode.get() && Meteor.user();
  },
  announcementDetail() {
    return dbVariables.get('announcementDetail');
  }
});
Template.announcement.events({
  'click [data-action="editAnnouncement"]'(event) {
    event.preventDefault();
    rInEditAnnouncementMode.set(true);
  }
});

Template.announcementForm.onRendered(function() {
  this.$announcementShort = this.$('#announcement-short');
  this.$announcementDetail = this.$('#announcement-detail');
});
Template.announcementForm.events({
  submit(event, templateInstance) {
    event.preventDefault();
    const announcement = templateInstance.$announcementShort.val();
    const announcementDetail = templateInstance.$announcementDetail.val();
    Meteor.customCall('editAnnouncement', announcement, announcementDetail);
  },
  reset(event) {
    event.preventDefault();
    rInEditAnnouncementMode.set(false);
  }
});

Template.systemStatusPanel.helpers({
  roundStartTime() {
    const currentRound = dbRound.findOne({}, {
      sort: {
        beginDate: -1
      }
    });

    return currentRound ? formatDateText(currentRound.beginDate) : '';
  },
  roundEndTime() {
    const currentRound = dbRound.findOne({}, {
      sort: {
        beginDate: -1
      }
    });

    return currentRound ? formatDateText(currentRound.endDate) : '';
  },
  seasonStartTime() {
    const currentSeason = dbSeason.findOne({}, {
      sort: {
        beginDate: -1
      }
    });

    return currentSeason ? formatDateText(currentSeason.beginDate) : '';
  },
  seasonEndTime() {
    const currentSeason = dbSeason.findOne({}, {
      sort: {
        beginDate: -1
      }
    });

    return currentSeason ? formatDateText(currentSeason.endDate) : '';
  },
  stockPriceUpdateTime() {
    const time = dbVariables.get('lastRecordListPriceTime');

    return formatDateText(time ? new Date(time) : null);
  },
  lowPriceReleaseTime() {
    const time = dbVariables.get('lastReleaseStocksForLowPriceTime');

    return formatDateText(time ? new Date(time) : null);
  },
  highPriceReleaseTime() {
    const time = dbVariables.get('lastReleaseStocksForHighPriceTime');

    return formatDateText(time ? new Date(time) : null);
  },
  noDealReleaseTime() {
    const time = dbVariables.get('lastReleaseStocksForNoDealTime');

    return formatDateText(time ? new Date(time) : null);
  },
  updateSalaryDeadline() {
    const seasonData = dbSeason
      .findOne({}, {
        sort: {
          beginDate: -1
        }
      });

    return formatDateText(seasonData ? new Date(seasonData.endDate.getTime() - Meteor.settings.public.announceSalaryTime) : null);
  },
  updateBonusDeadline() {
    const seasonData = dbSeason
      .findOne({}, {
        sort: {
          beginDate: -1
        }
      });

    return formatDateText(seasonData ? new Date(seasonData.endDate.getTime() - Meteor.settings.public.announceBonusTime) : null);
  }
});
