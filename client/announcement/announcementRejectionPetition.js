import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { reactiveInterval } from 'meteor/teamgrid:reactive-interval';

import { alertDialog } from '../layout/alertDialog';
import { paramAnnouncementId, paramAnnouncement, computeThreshold } from './helpers';

function isRejectionPetitionOverdue({ dueAt }) {
  return Date.now() > dueAt.getTime();
}

function isRejectionPetitionPassed({ passedAt }) {
  return !! passedAt;
}

Template.announcementRejectionPetition.helpers({
  petition() {
    return paramAnnouncement().rejectionPetition;
  },
  signerCount() {
    return paramAnnouncement().rejectionPetition.signers.length;
  },
  threshold() {
    return computeThreshold(paramAnnouncement().rejectionPetition);
  },
  isPassed() {
    return !! paramAnnouncement().rejectionPetition.passedAt;
  },
  isOverdue() {
    return isRejectionPetitionOverdue(paramAnnouncement().rejectionPetition);
  },
  isVoided() {
    return paramAnnouncement().voided;
  },
  canSign() {
    const currentUserId = Meteor.userId();
    const { rejectionPetition, voided } = paramAnnouncement();
    const { signers } = rejectionPetition;
    const isOverdue = isRejectionPetitionOverdue(rejectionPetition);
    const isPassed = isRejectionPetitionPassed(rejectionPetition);

    return currentUserId && ! voided && ! signers.includes(currentUserId) && ! isOverdue && ! isPassed;
  },
  remainingTime() {
    reactiveInterval(500);

    const { dueAt } = paramAnnouncement().rejectionPetition;

    return Math.max(dueAt.getTime() - Date.now(), 0);
  }
});

Template.announcementRejectionPetition.events({
  'click [data-action="signRejectionPetition"]'(event) {
    event.preventDefault();

    alertDialog.confirm({
      title: '參與否決連署',
      message: '參與連署後將無法取消，確定要參與本次否決連署嗎？',
      callback(result) {
        if (! result) {
          return;
        }

        const announcementId = paramAnnouncementId();

        Meteor.customCall('signRejectionPetition', { announcementId });
      }
    });
  }
});
