import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { getAnnounceableCategories, dbAnnouncements } from '/db/dbAnnouncements';

export function paramAnnouncementId() {
  return FlowRouter.getParam('announcementId');
}

export function paramAnnouncement() {
  const announcementId = paramAnnouncementId();

  return announcementId ? dbAnnouncements.findOne(announcementId) : null;
}

export function computeThreshold({ thresholdPercent, activeUserCount }) {
  return Math.ceil(activeUserCount * thresholdPercent / 100);
}


export function canCreateAnnouncement() {
  return getAnnounceableCategories(Meteor.user()).length > 0;
}
