import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { hasAnyRoles } from '/db/users';
import { categoryDisplayName } from '/db/dbAnnouncements';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { alertDialog } from '../layout/alertDialog';
import { paramAnnouncementId, paramAnnouncement } from './helpers';

inheritedShowLoadingOnSubscribing(Template.announcementDetail);

Template.announcementDetail.onCreated(function() {
  this.autorunWithIdleSupport(() => {
    const announcementId = paramAnnouncementId();

    if (! announcementId) {
      return;
    }

    Meteor.subscribe('announcementDetail', paramAnnouncementId());
  });
});

Template.announcementDetail.events({
  'click [data-action="deleteAnnouncement"]'(event) {
    event.preventDefault();

    const announcementId = paramAnnouncementId();

    if (! announcementId) {
      return;
    }

    alertDialog.confirm({
      title: '刪除公告',
      message: '刪除後將無法復原，確定要將此公告刪除嗎？',
      callback(result) {
        if (! result) {
          return;
        }

        Meteor.customCall('deleteAnnouncement', { announcementId }, (error) => {
          if (! error) {
            FlowRouter.go('announcementList');
          }
        });
      }
    });
  }
});

Template.announcementDetail.helpers({
  categoryDisplayName,
  announcement() {
    return paramAnnouncement();
  },
  canManageAnnouncement() {
    const currentUser = Meteor.user();

    if (! currentUser) {
      return false;
    }

    const { creator } = paramAnnouncement();

    return hasAnyRoles(currentUser, 'generalManager', 'superAdmin') || currentUser._id === creator;
  },
  canRejectAnnoumcenet() {
    return Meteor.user() && paramAnnouncement().hasRejectionPetition;
  },
  pathForRejectAnnouncement() {
    return FlowRouter.path('rejectAnnouncement', { announcementId: paramAnnouncementId() });
  }
});
