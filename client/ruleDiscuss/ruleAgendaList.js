'use strict';
import SimpleSchema from 'simpl-schema';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { dbAdvertising } from '../../db/dbAdvertising';
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
    // this.subscribe('allAdvertising');
  });
});
Template.ruleAgendaList.helpers({
  getNewAgendaHref() {
    return FlowRouter.path('createRuleAgenda');
  },
  getAgendaHref(agendaId) {
    return FlowRouter.path('ruleAgenda') + '/' + agendaId;
  },
  processingAgendaList() {
    return [];
  },
  finishAgendaList() {
    return [];
  },
  formatExpireDate(agenda) {
    return Date.now();
  }
});

Template.ruleAgendaList.events({
  'click [data-take-down]'(event) {
    event.preventDefault();
    const advertisingId = $(event.currentTarget).attr('data-take-down');
    const advertisingData = dbAdvertising.findOne(advertisingId);
    alertDialog.confirm('確定要撤銷議程「' + advertisingData.message + '」？', (result) => {
      if (result) {
        Meteor.customCall('takeDownAdvertising', advertisingId);
      }
    });
  }
});
