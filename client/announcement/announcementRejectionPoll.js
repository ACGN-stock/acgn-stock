import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { reactiveInterval } from 'meteor/teamgrid:reactive-interval';

import { alertDialog } from '../layout/alertDialog';
import { paramAnnouncementId, paramAnnouncement, computeThreshold } from './helpers';

Template.announcementRejectionPoll.helpers({
  poll() {
    return paramAnnouncement().rejectionPoll;
  },
  threshold() {
    return computeThreshold(paramAnnouncement().rejectionPoll);
  },
  isFinished() {
    const { voided, rejectionPoll } = paramAnnouncement();

    return voided || Date.now() > rejectionPoll.dueAt;
  },
  isVoided() {
    return paramAnnouncement().voided;
  },
  canVote() {
    const currentUser = Meteor.user();
    const { voided } = paramAnnouncement();
    const { currentUserChoice, dueAt } = paramAnnouncement().rejectionPoll;

    const isOverdue = Date.now() > dueAt.getTime();
    const hasVoted = !! currentUserChoice;

    return currentUser && ! voided && ! isOverdue && ! hasVoted;
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
  },
  showVoteLists() {
    const { yesVotes, noVotes, dueAt } = paramAnnouncement().rejectionPoll;
    const isOverdue = Date.now() > dueAt.getTime();

    return isOverdue && yesVotes && noVotes;
  },
  remainingTime() {
    reactiveInterval(500);

    const { dueAt } = paramAnnouncement().rejectionPoll;

    return Math.max(dueAt.getTime() - Date.now(), 0);
  }
});

Template.announcementRejectionPoll.events({
  'click [data-vote]'(event, templateInstance) {
    event.preventDefault();

    const choice = templateInstance.$(event.currentTarget).attr('data-vote');

    if (! ['yes', 'no'].includes(choice)) {
      return;
    }

    const choiceDisplayMap = {
      yes: '<span class="text-success">贊成票</span>',
      no: '<span class="text-danger">反對票</span>'
    };

    alertDialog.confirm({
      title: '參與否決投票',
      message: `參與投票後將無法取消，確定要投下${choiceDisplayMap[choice]}嗎？`,
      callback(result) {
        if (! result) {
          return;
        }

        const announcementId = paramAnnouncementId();

        Meteor.customCall('voteRejectionPoll', { announcementId, choice });
      }
    });
  }
});
