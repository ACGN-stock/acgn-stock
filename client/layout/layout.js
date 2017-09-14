'use strict';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { rShowLoginDialog } from './validateDialog';
import { rShowAlertDialog } from './alertDialog';

export const rMainTheme = new ReactiveVar('light');

//每次開啟網頁時只確認一次預設theme
if (! localStorage.getItem('theme')) {
  localStorage.setItem('theme', 'light');
}
Template.layout.onCreated(function() {
  rMainTheme.set(localStorage.getItem('theme'));
});
Template.layout.helpers({
  currentPage() {
    return FlowRouter.getRouteName();
  },
  showLoginDialog() {
    return rShowLoginDialog.get() && ! Meteor.user();
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

