import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { DocHead } from 'meteor/kadira:dochead';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
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

const rShowOptionVoteDetail = new ReactiveVar(null);

inheritedShowLoadingOnSubscribing(Template.ruleAgendaDetail);
Template.ruleAgendaDetail.onCreated(function() {
  rShowOptionVoteDetail.set(null);
  this.autorun(() => {
    const agendaId = FlowRouter.getParam('agendaId');
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
    const agendaId = FlowRouter.getParam('agendaId');
    if (agendaId) {
      this.subscribe('ruleAgendaDetail', agendaId);
    }
  });
});
Template.ruleAgendaDetail.helpers({
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
  },
  getVoteHref() {
    const agendaId = FlowRouter.getParam('agendaId');

    return FlowRouter.path('ruleAgendaVote', { agendaId });
  },
  showVoteDetailDialog() {
    return rShowOptionVoteDetail.get() !== null;
  }
});
Template.ruleAgendaDetail.events({
  'click [data-action="takeDownRuleAgenda"]'(event) {
    event.preventDefault();
    const agendaId = FlowRouter.getParam('agendaId');
    const agendaData = dbRuleAgendas.findOne(agendaId);
    alertDialog.confirm({
      message: '確定要撤銷議程「' + agendaData.title + '」？',
      callback: (result) => {
        if (result) {
          Meteor.customCall('takeDownRuleAgenda', agendaId, function(error) {
            if (! error) {
              const path = FlowRouter.path('ruleAgendaList');
              FlowRouter.go(path);
            }
          });
        }
      }
    });
  },
  'click [data-action="updateAgendaProposer"]'(event) {
    event.preventDefault();
    const agendaId = FlowRouter.getParam('agendaId');
    const message = '請輸入提案人id：';

    alertDialog.prompt({
      message,
      callback: (result) => {
        if (result) {
          Meteor.customCall('updateAgendaProposer', agendaId, result, function(error) {
            if (! error) {
              alertDialog.alert('修改成功！');
            }
          });
        }
      }
    });
  }
});

Template.ruleAgendaTable.helpers({
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

Template.ruleIssueList.helpers({
  getOptionText(optionId) {
    const option = dbRuleIssueOptions.findOne(optionId);

    return option ? option.title : '';
  },
  getOptionCount(optionId) {
    const option = dbRuleIssueOptions.findOne(optionId);

    return option ? option.votes.length : 0;
  }
});

Template.ruleIssueList.events({
  'click [data-show-vote]'(event) {
    event.preventDefault();
    const optionId = $(event.currentTarget).attr('data-show-vote');
    const option = dbRuleIssueOptions.findOne(optionId);
    rShowOptionVoteDetail.set(option);
  }
});

Template.voteDetailDialog.helpers({
  voteDetailDialogTitle() {
    const option = rShowOptionVoteDetail.get();
    const message = '投給「' + option.title + '」的玩家';

    return message;
  },
  voteList() {
    return rShowOptionVoteDetail.get().votes;
  }
});

Template.voteDetailDialog.events({
  'click .btn'(event) {
    event.preventDefault();
    rShowOptionVoteDetail.set(null);
  }
});
