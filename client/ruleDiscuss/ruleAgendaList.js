import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbRuleAgendas } from '/db/dbRuleAgendas';
import { formatDateTimeText } from '/common/imports/utils/formatTimeUtils';

import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
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
    return FlowRouter.path('ruleAgendaDetail', { agendaId });
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

    return formatDateTimeText(expireDate);
  }
});
