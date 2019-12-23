import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbRound } from '/db/dbRound';
import { dbSeason } from '/db/dbSeason';
import { dbVariables } from '/db/dbVariables';
import { formatDateTimeText, formatShortDurationTimeText } from '/common/imports/utils/formatTimeUtils';

import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { currencyFormat } from '../utils/helpers';
import { shouldStopSubscribe } from '../utils/idle';

Template.mainPage.helpers({
  websiteName() {
    return Meteor.settings.public.websiteInfo.websiteName;
  }
});

inheritedShowLoadingOnSubscribing(Template.legacyAnnouncement);
const rInEditAnnouncementMode = new ReactiveVar(false);
Template.legacyAnnouncement.onCreated(function() {
  rInEditAnnouncementMode.set(false);
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    this.subscribe('legacyAnnouncementDetail');
  });
});
Template.legacyAnnouncement.helpers({
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
Template.legacyAnnouncement.events({
  'click [data-action="legacyEditAnnouncement"]'(event) {
    event.preventDefault();
    rInEditAnnouncementMode.set(true);
  }
});

Template.legacyAnnouncementForm.onRendered(function() {
  this.$announcementShort = this.$('#announcement-short');
  this.$announcementDetail = this.$('#announcement-detail');
});
Template.legacyAnnouncementForm.events({
  submit(event, templateInstance) {
    event.preventDefault();
    const announcement = templateInstance.$announcementShort.val();
    const announcementDetail = templateInstance.$announcementDetail.val();
    Meteor.customCall('legacyEditAnnouncement', announcement, announcementDetail);
  },
  reset(event) {
    event.preventDefault();
    rInEditAnnouncementMode.set(false);
  }
});

const nowTime = new ReactiveVar(Date.now());
Meteor.setInterval(function() {
  nowTime.set(Date.now());
}, 1000);

function aboutToEnd(end, hour) {
  const threshold = 1000 * 60 * 60 * hour;

  if (end) {
    const rest = new Date(end).getTime() - nowTime.get();

    return ((rest >= 0) && (rest <= threshold));
  }
  else {
    return false;
  }
}

Template.systemStatusPanel.onCreated(function() {
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    this.subscribe('currentRound');
    this.subscribe('currentSeason');
    this.subscribe('onlinePeopleNumber');
  });
});
Template.systemStatusPanel.helpers({
  onlinePeopleNumber() {
    return dbVariables.get('onlinePeopleNumber') || 0;
  },
  roundStartTime() {
    const currentRound = dbRound.findOne({}, {
      sort: {
        beginDate: -1
      }
    });

    return currentRound ? formatDateTimeText(currentRound.beginDate) : '????/??/?? ??:??:??';
  },
  roundEndTime() {
    const currentRound = dbRound.findOne({}, {
      sort: {
        beginDate: -1
      }
    });

    return currentRound ? formatDateTimeText(currentRound.endDate) : '????/??/?? ??:??:??';
  },
  seasonStartTime() {
    const currentSeason = dbSeason.findOne({}, {
      sort: {
        beginDate: -1
      }
    });

    return currentSeason ? formatDateTimeText(currentSeason.beginDate) : '????/??/?? ??:??:??';
  },
  seasonEndTime() {
    const currentSeason = dbSeason.findOne({}, {
      sort: {
        beginDate: -1
      }
    });

    return currentSeason ? formatDateTimeText(currentSeason.endDate) : '????/??/?? ??:??:??';
  },
  stockPriceUpdateBegin() {
    const time = dbVariables.get('recordListPriceBegin');

    return formatDateTimeText(time ? new Date(time) : null);
  },
  stockPriceUpdateEnd() {
    const time = dbVariables.get('recordListPriceEnd');

    return formatDateTimeText(time ? new Date(time) : null);
  },
  highPriceReleaseBegin() {
    const time = dbVariables.get('releaseStocksForHighPriceBegin');

    return formatDateTimeText(time ? new Date(time) : null);
  },
  highPriceReleaseEnd() {
    const time = dbVariables.get('releaseStocksForHighPriceEnd');

    return formatDateTimeText(time ? new Date(time) : null);
  },
  noDealReleaseBegin() {
    const time = dbVariables.get('releaseStocksForNoDealBegin');

    return formatDateTimeText(time ? new Date(time) : null);
  },
  noDealReleaseEnd() {
    const time = dbVariables.get('releaseStocksForNoDealEnd');

    return formatDateTimeText(time ? new Date(time) : null);
  },
  updateSalaryDeadline() {
    const seasonData = dbSeason
      .findOne({}, {
        sort: {
          beginDate: -1
        }
      });

    return formatDateTimeText(seasonData ? new Date(seasonData.endDate.getTime() - Meteor.settings.public.announceSalaryTime) : null);
  },
  updateProfitDistributionDeadline() {
    const seasonData = dbSeason.findOne({}, { sort: { beginDate: -1 } });

    return formatDateTimeText(seasonData ? new Date(seasonData.endDate.getTime() - Meteor.settings.public.companyProfitDistribution.lockTime) : null);
  },
  highPriceThreshold() {
    return currencyFormat(dbVariables.get('highPriceThreshold'));
  },
  lowPriceThreshold() {
    return currencyFormat(dbVariables.get('lowPriceThreshold'));
  },
  taskIsReady(begin, end) {
    const now = nowTime.get();

    if (begin && end) {
      begin = new Date(begin).getTime();
      end = new Date(end).getTime();

      return (now >= begin && now <= end) ? 'text-danger' : '';
    }
  },
  taskLeftInfo(end, hour) {
    const rest = (new Date(end).getTime() - nowTime.get());

    return aboutToEnd(end, hour) ? `(${formatShortDurationTimeText(rest)})` : '';
  },
  taskIsAboutToEnd(end, hour) {
    return aboutToEnd(end, hour) ? 'text-danger' : '';
  }
});
