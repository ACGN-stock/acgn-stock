'use strict';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

export const rShowAlertDialog = new ReactiveVar(false);
let strAlertDialogTitle = '';
let strAlertDialogMessage = '';
let strAlertDialogDefaultValue = null;
let strAlertDialogType = 'alert';
let funcAlertDialogCallback = null;
let blAlertDialogOK = false;

export const alertDialog = {
  dialog: function(options) {
    strAlertDialogType = options.type;
    strAlertDialogTitle = options.title;
    strAlertDialogMessage = options.message;
    strAlertDialogDefaultValue = options.defaultValue;
    funcAlertDialogCallback = options.callback;
    blAlertDialogOK = false;
    rShowAlertDialog.set(true);
  },
  alert: function(message) {
    this.dialog({
      type: 'alert',
      title: '',
      message: message,
      defaultValue: null,
      callback: null
    });
  },
  confirm: function(message, callback) {
    this.dialog({
      type: 'confirm',
      title: '',
      message: message,
      defaultValue: null,
      callback: callback
    });
  },
  prompt: function(message, callback, defaultValue) {
    this.dialog({
      type: 'prompt',
      title: '',
      message: message,
      defaultValue: defaultValue,
      callback: callback
    });
  }
};

Template.alertDialog.onRendered(function() {
  this.$('input').select();
});
Template.alertDialog.onDestroyed(function() {
  const callback = funcAlertDialogCallback;
  const ok = blAlertDialogOK;
  if (strAlertDialogType === 'prompt') {
    const value = this.$('input').val();
    this.$('input').val('');
    if (callback) {
      callback(ok && value);
    }
  }
  else if (callback) {
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
  reset(event) {
    event.preventDefault();
    blAlertDialogOK = false;
    rShowAlertDialog.set(false);
  },
  submit(event) {
    event.preventDefault();
    blAlertDialogOK = true;
    rShowAlertDialog.set(false);
  }
});
