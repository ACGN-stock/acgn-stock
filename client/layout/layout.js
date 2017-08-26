'use strict';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { rShowLoginDialog } from './validateDialog';
import { rShowAlertDialog } from './alertDialog';

Template.layout.helpers({
  currentPage() {
    return FlowRouter.getRouteName();
  },
  showLoginDialog() {
    return rShowLoginDialog.get() && ! Meteor.user();
  },
  showAlertDialog() {
  	return rShowAlertDialog.get();
  }
});

