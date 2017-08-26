'use strict';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

export const rShowAlertDialog = new ReactiveVar(false);
var strAlertDialogTitle = '';
var strAlertDialogMessage = '';
var strAlertDialogDefaultValue = null;
var strAlertDialogType = 'alert';
var funcAlertDialogCallback = null;
var blAlertDialogOK = false;

export const AlertDialog = {
  dialog: function(type, title, message, defaultValue, callback) {
    strAlertDialogType = type;
    strAlertDialogTitle = title;
    strAlertDialogMessage = message;
    strAlertDialogDefaultValue = defaultValue;
    funcAlertDialogCallback = callback;
    blAlertDialogOK = false;
    rShowAlertDialog.set(true);
  },
  alert: function(message) {
    this.dialog('alert', '', message, null, null);
  },
  confirm: function(message, callback) {
    this.dialog('confirm', '', message, null, callback);
  },
  prompt: function(message, callback, defaultValue) {
    this.dialog('prompt', '', message, defaultValue, callback);
  },
  promptWithTitle: function(title, message, callback, defaultValue) {
    this.dialog('prompt', title, message, defaultValue, callback);
  },
};

Template.alertDialog.onRendered(function() {
  this.$('input').select();
});
Template.alertDialog.onDestroyed(function() {
  const callback = funcAlertDialogCallback;
  const ok = blAlertDialogOK;
  
  if (strAlertDialogType === 'prompt') {
    const value = this.$('input').val();
    this.$('input').val("");
    if (callback) {
      callback(ok && value);
    }
  } else if (callback) {
    callback(ok);
  }
});
Template.alertDialog.helpers({
  alertDialogTitle() {
    return strAlertDialogTitle;
  },
  alertDialogMessage() {
    return strAlertDialogMessage;
  },
  alertDialogDefaultValue() {
    return strAlertDialogDefaultValue;
  },
  showTitle() {
    return strAlertDialogTitle.length > 0;
  },
  showTextInput() {
    return strAlertDialogType === 'prompt';
  },
  showCancelButton() {
    return strAlertDialogType !== 'alert';
  }
});
Template.alertDialog.events({
  reset(event, templateInstance) {
    blAlertDialogOK = false;
    rShowAlertDialog.set(false);
  },
  submit(event, templateInstance) {
    event.preventDefault();
    blAlertDialogOK = true;
    rShowAlertDialog.set(false);
  }
});
