'use strict';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { handleError } from '../utils/handleError';
import { dbValidatingUsers } from '../../db/dbValidatingUsers';
import { addTask, resolveTask } from '../layout/loading';
import { regUsername } from '../utils/regexp';
import { alertDialog } from '../layout/alertDialog';
import { shouldStopSubscribe } from '../utils/idle';

export const rAccountDialogMode = new ReactiveVar(false);
const rUserName = new ReactiveVar('');
const rPassword = new ReactiveVar('');
const rCode = new ReactiveVar('');
Template.accountDialog.onCreated(function() {
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const usermame = rUserName.get();
    if (usermame) {
      this.subscribe('validateUser', usermame);
    }
  });
  dbValidatingUsers.find().observeChanges({
    removed: () => {
      const dialogMode = rAccountDialogMode.get();
      if (dialogMode === 'validatePTT' || dialogMode === 'validateBahamut') {
        const type = dialogMode.replace('validate', '');
        tryLogin(rUserName.get(), rPassword.get(), type);
      }
    }
  });
});
Template.accountDialog.events({
  reset() {
    rUserName.set('');
    rPassword.set('');
    rCode.set('');
    rAccountDialogMode.set(false);
  },
  submit(event, templateInstance) {
    event.preventDefault();
    const dialogMode = rAccountDialogMode.get();
    switch (dialogMode) {
      case 'validatePTT': {
        Meteor.customCall('validatePTTAccount', rUserName.get());
        break;
      }
      case 'validateBahamut': {
        Meteor.customCall('validateBahamutAccount', rUserName.get());
        break;
      }
      case 'loginPTT':
      case 'loginBahamut': {
        const username = templateInstance.$('#loginUserName').val();
        const password = templateInstance.$('#loginPassword').val();
        if (! username || ! regUsername.test(username) || ! password) {
          window.alert('錯誤的帳號或密碼格式！');

          return false;
        }
        rUserName.set(username);
        rPassword.set(password);
        const type = dialogMode.replace('login', '');
        const reset = false;
        Meteor.customCall('loginOrRegister', {username, password, type, reset}, (error, result) => {
          if (result === true) {
            tryLogin(username, password, type);
          }
          else {
            onGotValidateCode(result, type);
          }
        });
        break;
      }
    }
  }
});

const utilHelpers = {
  displayByDialogMode() {
    switch (rAccountDialogMode.get()) {
      case 'validatePTT': {
        return 'accountDialogBodyValidatePTT';
      }
      case 'validateBahamut': {
        return 'accountDialogBodyValidateBahamut';
      }
      case 'loginPTT': {
        return 'accountDialogBodyLoginPTT';
      }
      case 'loginBahamut': {
        return 'accountDialogBodyLoginBahamut';
      }
    }
  },
  validateUserName() {
    return rUserName.get();
  },
  validateCode() {
    return rCode.get();
  }
};
Template.accountDialog.helpers(utilHelpers);
Template.accountDialogBodyValidatePTT.helpers(utilHelpers);
Template.accountDialogBodyValidateBahamut.helpers(utilHelpers);
Template.accountDialogBodyLoginPTT.helpers(utilHelpers);
Template.accountDialogBodyLoginBahamut.helpers(utilHelpers);

function tryLogin(username, password, type) {
  const loginUsername = (type === 'Bahamut') ? ('?' + username) : username;
  addTask();
  Meteor.loginWithPassword(loginUsername, password, (error) => {
    resolveTask();
    if (error) {
      if (error.message === 'Incorrect password [403]') {
        confirmResetPassword(username, password, type);
      }
      else {
        handleError(error);
      }
    }
  });
}

function confirmResetPassword(username, password, type) {
  alertDialog.confirm('密碼錯誤，是否嘗試設定新密碼並重新驗證？', (result) => {
    if (result) {
      const reset = true;
      Meteor.customCall('loginOrRegister', {username, password, type, reset}, (error, result) => {
        if (! error) {
          onGotValidateCode(result, type);
        }
      });
    }
  });
}

function onGotValidateCode(code, type) {
  rCode.set(code);
  rAccountDialogMode.set('validate' + type);
}
