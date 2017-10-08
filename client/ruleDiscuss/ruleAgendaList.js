'use strict';
import SimpleSchema from 'simpl-schema';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { dbRuleAgendas } from '../../db/dbRuleAgendas';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { inheritUtilForm, handleInputChange as inheritedHandleInputChange } from '../utils/form';
import { formatDateText } from '../utils/helpers';
import { config } from '../../config';
import { integerString } from '../utils/regexp';
import { alertDialog } from '../layout/alertDialog';
import { shouldStopSubscribe } from '../utils/idle';

inheritedShowLoadingOnSubscribing(Template.ruleAgendaList);
Template.ruleAgendaList.onCreated(function() {
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    this.subscribe('allRuleAgenda');
  });
});
Template.ruleAgendaList.helpers({
  getNewAgendaHref() {
    return FlowRouter.path('createRuleAgenda');
  },
  getAgendaHref(agendaId) {
    return FlowRouter.path('ruleAgendaDetail', {agendaId});
  },
  processingAgendaList() {
    const currentDate = Date.now();
    const agendaList = [];
    dbRuleAgendas.find({}, {
      sort: {
        createdAt: -1
      }
    }).forEach((agenda) => {
      const expireDate = new Date(agenda.createdAt.getTime() + (agenda.duration * 60 * 60 * 1000));
      if (expireDate >= currentDate) {
        agendaList.push(agenda);
      }
    });
    return agendaList;
  },
  finishAgendaList() {
    const currentDate = Date.now();
    const agendaList = [];
    dbRuleAgendas.find({}, {
      sort: {
        createdAt: -1
      }
    }).forEach((agenda) => {
      const expireDate = new Date(agenda.createdAt.getTime() + (agenda.duration * 60 * 60 * 1000));
      if (expireDate < currentDate) {
        agendaList.push(agenda);
      }
    });

    return agendaList;
  },
  formatExpireDate(agenda) {
    const expireDate = new Date(agenda.createdAt.getTime() + (agenda.duration * 60 * 60 * 1000));
    
    return formatDateText(expireDate);
  }
});

Template.ruleAgendaList.events({
  'click [data-take-down]'(event) {
    event.preventDefault();
    const agendaId = $(event.currentTarget).attr('data-take-down');
    const agendaData = dbRuleAgendas.findOne(agendaId);
    alertDialog.confirm('確定要撤銷議程「' + agendaData.title + '」？', (result) => {
      if (result) {
        Meteor.customCall('takeDownRuleAgenda', agendaId);
      }
    });
  }
});
