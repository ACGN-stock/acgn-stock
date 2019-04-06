import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { DocHead } from 'meteor/kadira:dochead';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { getCurrentPageFullTitle } from '/routes';
import { dbRound } from '/db/dbRound';
import { dbRuleAgendas } from '/db/dbRuleAgendas';
import { dbRuleIssues } from '/db/dbRuleIssues';
import { dbRuleIssueOptions } from '/db/dbRuleIssueOptions';
import { setPrerenderTitleReady } from '/client/utils/prerenderReady';

import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { alertDialog } from '../layout/alertDialog';
import { shouldStopSubscribe } from '../utils/idle';

inheritedShowLoadingOnSubscribing(Template.ruleAgendaVote);
Template.ruleAgendaVote.onCreated(function() {
  const agendaId = FlowRouter.getParam('agendaId');
  if (agendaId) {
    this.subscribe('ruleAgendaDetail', agendaId);
  }
  this.autorun(() => {
    if (agendaId) {
      const agendaData = dbRuleAgendas.findOne(agendaId);
      if (agendaData) {
        DocHead.setTitle(getCurrentPageFullTitle(agendaData.title));
        setPrerenderTitleReady(true);
      }
      else {
        setPrerenderTitleReady(false);
      }
    }
  });
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    this.subscribe('currentRound');
    if (Meteor.user()) {
      this.subscribe('userCreatedAt');
    }
  });
});
Template.ruleAgendaVote.helpers({
  agendaData() {
    const agendaId = FlowRouter.getParam('agendaId');

    return dbRuleAgendas.findOne(agendaId);
  },
  canVote(agendaData) {
    const expireDate = new Date(agendaData.createdAt.getTime() + agendaData.duration * 60 * 60 * 1000);
    if (expireDate < Date.now()) {
      return false;
    }
    const user = Meteor.user();
    if (user.profile.ban.length > 0) {
      return false;
    }
    const now = Date.now();
    const voteUserNeedCreatedIn = Meteor.settings.public.voteUserNeedCreatedIn;
    const currentRound = dbRound.findOne({}, {
      sort: {
        beginDate: -1
      }
    });
    if ((now - currentRound.beginDate.getTime()) > (voteUserNeedCreatedIn * 2)) {
      const userCreatedAt = user.createdAt;
      if (! userCreatedAt || ((now - userCreatedAt.getTime()) < voteUserNeedCreatedIn)) {
        return false;
      }
    }
    const userId = user._id;
    if (agendaData.votes.indexOf(userId) >= 0) {
      return false;
    }

    return true;
  }
});
Template.ruleAgendaVote.events({
  'submit .form-vote'(event) {
    event.preventDefault();

    const agendaId = FlowRouter.getParam('agendaId');
    const voteOptions = [];
    $('input:checked').each(function() {
      const optionId = $(this).val();
      voteOptions.push(optionId);
    });

    const model = {
      agendaId: agendaId,
      options: voteOptions
    };

    const message = '投票送出後不可再修改與重新投票，確認是否送出？<br>若有未選擇的議題則視為放棄該題之投票權。';
    alertDialog.confirm({
      message,
      callback: (result) => {
        if (result) {
          Meteor.customCall('voteAgenda', model, function(error) {
            if (! error) {
              const path = FlowRouter.path('ruleAgendaDetail', { agendaId });
              FlowRouter.go(path);
            }
          });
        }
      }
    });
  }
});

Template.ruleAgendaVoteForm.helpers({
  getIssueList(issueIds) {
    return dbRuleIssues.find({
      _id: {
        $in: issueIds
      }
    }, {
      sort: {
        order: 1
      }
    });
  },
  getBackHref() {
    const agendaId = FlowRouter.getParam('agendaId');

    return FlowRouter.path('ruleAgendaDetail', { agendaId });
  }
});

Template.ruleIssueVoteList.helpers({
  getOptionText(optionId) {
    const option = dbRuleIssueOptions.findOne(optionId);

    return option ? option.title : '';
  }
});
