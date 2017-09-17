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

export const rShowLoginDialog = new ReactiveVar(false);
const rValidateUserName = new ReactiveVar('');
const rValidateCode = new ReactiveVar('');
let password = '';

Template.validateDialog.onCreated(function() {
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const usermame = rValidateUserName.get();
    if (usermame) {
      this.subscribe('validateUser', usermame);
    }
  });
  dbValidatingUsers.find().observeChanges({
    removed: () => {
      const usermame = rValidateUserName.get();
      if (usermame && password) {
        addTask();
        Meteor.loginWithPassword(usermame, password, resolveTask);
      }
    }
  });
});
Template.validateDialog.helpers({
  validateUserName() {
    return rValidateUserName.get();
  },
  validateCode() {
    return rValidateCode.get();
  }
});
Template.validateDialog.events({
  reset() {
    rValidateUserName.set('');
    password = '';
    rValidateCode.set('');
    rShowLoginDialog.set(false);
  },
  submit(event, templateInstance) {
    event.preventDefault();
    if (rValidateCode.get()) {
      Meteor.call('validateAccount', rValidateUserName.get());
    }
    else {
      const username = templateInstance.$('#loginUserName').val();
      password = templateInstance.$('#loginPassword').val();
      if (! username || ! regUsername.test(username) || ! password) {
        window.alert('錯誤的帳號或密碼格式！');

        return false;
      }
      rValidateUserName.set(username);

      Meteor.call('loginOrRegister', username, password, false, (error, result) => {
        if (result === true) {
          Meteor.loginWithPassword(username, password, (error) => {
            if (error) {
              if (error.message === 'Incorrect password [403]') {
                alertDialog.confirm('密碼錯誤，是否嘗試設定新密碼並重新驗證？', (result) => {
                  if (result) {
                    Meteor.call('loginOrRegister', username, password, true, (error, result) => {
                      if (error) {
                        handleError(error);
                      }
                      else {
                        rValidateCode.set(result);
                      }
                    });
                  }
                });
              }
              else {
                handleError(error);
              }
            }
          });
        }
        else {
          rValidateCode.set(result);
        }
      });
    }
  }
});
