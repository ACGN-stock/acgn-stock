import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { hasAnyRoles } from '/db/users';
import { categoryDisplayName } from '/db/dbAnnouncements';
import { alertDialog } from '../layout/alertDialog';
import { paramAnnouncementId, paramAnnouncement } from './helpers';

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
  }
});

function computeThreshold({ thresholdPercent, activeUserCount }) {
  return Math.floor(activeUserCount * thresholdPercent / 100);
}

function isRejectionPetitionOverdue({ dueAt }) {
  return Date.now() > dueAt.getTime();
}

function isRejectionPetitionPassed(rejectionPetition) {
  const { signers } = rejectionPetition;
  const threshold = computeThreshold(rejectionPetition);

  return signers.length >= threshold;
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
  canSign() {
    const { rejectionPetition } = paramAnnouncement();
    const { signers } = rejectionPetition;
    const isOverdue = isRejectionPetitionOverdue(rejectionPetition);
    const isPassed = isRejectionPetitionPassed(rejectionPetition);

    return ! isOverdue && ! isPassed && ! signers.includes(this.userId);
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

Template.announcementRejectionPoll.helpers({
  poll() {
    return paramAnnouncement().rejectionPoll;
  },
  threshold() {
    return computeThreshold(paramAnnouncement().rejectionPoll);
  },
  isFinished() {
    return Date.now() > paramAnnouncement().rejectionPoll.dueAt;
  },
  canVote() {
    const currentUser = Meteor.user();
    const { currentUserChoice, dueAt } = paramAnnouncement().rejectionPoll;

    const isOverdue = Date.now() > dueAt.getTime();
    const hasVoted = !! currentUserChoice;

    return currentUser && ! isOverdue && ! hasVoted;
  },
  choiceMatches(choice) {
    const { currentUserChoice } = paramAnnouncement().rejectionPoll;

    return currentUserChoice === choice;
  },
  voteCount(choice) {
    const { yesVotes, noVotes } = paramAnnouncement().rejectionPoll;

    return choice === 'yes' ? yesVotes.length : choice === 'no' ? noVotes.length : 0;
  },
  totalVoteCount() {
    const { yesVotes, noVotes } = paramAnnouncement().rejectionPoll;

    return yesVotes.length + noVotes.length;
  },
  isThresholdPassed() {
    const threshold = computeThreshold(paramAnnouncement().rejectionPoll);
    const { yesVotes, noVotes } = paramAnnouncement().rejectionPoll;
    const totalVoteCount = yesVotes.length + noVotes.length;

    return totalVoteCount >= threshold;
  }
});
