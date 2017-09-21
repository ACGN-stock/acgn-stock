'use strict';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { rAccountDialogMode } from './accountDialog';
import { rShowAlertDialog } from './alertDialog';
import { rMainTheme } from '../utils/styles';

Template.layout.helpers({
  currentPage() {
    return FlowRouter.getRouteName();
  },
  showAccountDialog() {
    return rAccountDialogMode.get() && ! Meteor.user();
  },
  showAlertDialog() {
    return rShowAlertDialog.get();
  },
  containerClass() {
    if (rMainTheme.get() === 'light') {
      return 'container container-light';
    }

    return 'container container-dark';
  }
});

