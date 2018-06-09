import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { categoryDisplayName } from '/db/dbAnnouncements';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { paramAnnouncementId, paramAnnouncement } from './helpers';

inheritedShowLoadingOnSubscribing(Template.rejectAnnouncement);

Template.rejectAnnouncement.onCreated(function() {
  this.autorunWithIdleSupport(() => {
    const announcementId = paramAnnouncementId();

    if (! announcementId) {
      return;
    }

    this.subscribe('announcementRejectionDetail', paramAnnouncementId());
  });
});

Template.rejectAnnouncement.helpers({
  categoryDisplayName,
  canRejectAnnoumcenet() {
    return !! paramAnnouncement().rejectionPetition;
  },
  announcement() {
    return paramAnnouncement();
  },
  pathForAnnouncement() {
    return FlowRouter.path('announcementDetail', { announcementId: paramAnnouncementId() });
  }
});
