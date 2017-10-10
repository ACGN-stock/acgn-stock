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
  }
});
Template.ruleAgendaVote.events({
  'submit .form-vote'(event){
    event.preventDefault();

    const agendaId = FlowRouter.getParam('agendaId');
    const voteOptions = [];
    $('input:checked').each( function() {
      const optionId = $(this).val();
      voteOptions.push(optionId);
    });

    const model = {
      agendaId: agendaId,
      options: voteOptions
    };

    const message = '投票送出後不可再修改與重新投票，確認是否送出？<br>若有未選擇的議題則視為放棄該題之投票權。';
    alertDialog.confirm(message, function(result) {
      if (result) {
        Meteor.customCall('voteAgenda', model, function(error) {
          if (! error) {
            const path = FlowRouter.path('ruleAgendaDetail', {agendaId});
            FlowRouter.go(path);
          }
        });
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

    return FlowRouter.path('ruleAgendaDetail', {agendaId});
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
