'use strict';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { DocHead } from 'meteor/kadira:dochead';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbRuleAgendas } from '../../db/dbRuleAgendas';
import { dbRuleIssues } from '../../db/dbRuleIssues';
import { dbRuleIssueOptions } from '../../db/dbRuleIssueOptions';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { formatDateTimeText } from '../utils/helpers';
import { config } from '../../config';
import { alertDialog } from '../layout/alertDialog';

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
        DocHead.setTitle(config.websiteName + ' - 「' + agendaData.title + '」議程資訊');
      }
    }
  });
});
Template.ruleAgendaVote.helpers({
  agendaData() {
    const agendaId = FlowRouter.getParam('agendaId');

    return dbRuleAgendas.findOne(agendaId);
  },
  getBackHref() {
    const agendaId = FlowRouter.getParam('agendaId');

    return FlowRouter.path('ruleAgendaDetail', {agendaId});
  }
});
Template.ruleAgendaVote.events({
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
  }  
});

Template.ruleIssueVoteList.helpers({
  getOptionText(optionId) {
    const option = dbRuleIssueOptions.findOne(optionId);

    return option ? option.title : '';
  },
  getOptionCount(optionId) {
    const option = dbRuleIssueOptions.findOne(optionId);

    return option ? option.votes.length : 0;
  }
});

Template.ruleIssueVoteList.events({
  'click [data-show-vote]'(event) {
    event.preventDefault();
    const optionId = $(event.currentTarget).attr('data-show-vote');
    const option = dbRuleIssueOptions.findOne(optionId);
  }
});
