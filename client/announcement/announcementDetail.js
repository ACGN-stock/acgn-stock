import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { hasAnyRoles } from '/db/users';
import { categoryDisplayName } from '/db/dbAnnouncements';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { voidAnnouncement } from '../utils/methods';
import { paramAnnouncementId, paramAnnouncement } from './helpers';

inheritedShowLoadingOnSubscribing(Template.announcementDetail);

Template.announcementDetail.onCreated(function() {
  this.autorunWithIdleSupport(() => {
    const announcementId = paramAnnouncementId();

    if (! announcementId) {
      return;
    }

    this.subscribe('announcementDetail', announcementId);
  });
});

Template.announcementDetail.events({
  'click [data-action="voidAnnouncement"]'(event) {
    event.preventDefault();

    const announcementId = paramAnnouncementId();

    if (! announcementId) {
      return;
    }

    voidAnnouncement({ announcementId });
  }
});

Template.announcementDetail.helpers({
  categoryDisplayName,
  announcement() {
    return paramAnnouncement();
  },
  canVoidAnnouncement() {
    const currentUser = Meteor.user();

    if (! currentUser) {
      return false;
    }

    const { creator, voided } = paramAnnouncement();

    const canManageAnnouncement = hasAnyRoles(currentUser, 'generalManager', 'superAdmin') || currentUser._id === creator;

    return canManageAnnouncement && ! voided;
  },
  canRejectAnnoumcenet() {
    return Meteor.user() && paramAnnouncement().hasRejectionPetition;
  },
  pathForRejectAnnouncement() {
    return FlowRouter.path('rejectAnnouncement', { announcementId: paramAnnouncementId() });
  }
});
