'use strict';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { handleError } from '../utils/handleError';
import { dbConfig } from '../../db/dbConfig';
import { dbValidatingUsers } from '../../db/dbValidatingUsers';
import { addTask, resolveTask } from '../layout/loading';

export const rShowLoginDialog = new ReactiveVar(false);
const rValidateUserName = new ReactiveVar('');
const rValidateCode = new ReactiveVar('');
let password = '';

Template.validateDialog.onCreated(function() {
  this.subscribe('dbConfig');
  this.autorun(() => {
    const usermame = rValidateUserName.get();
    if (usermame) {
      this.subscribe('validateUser', usermame);
    }
  });
  dbValidatingUsers.find().observeChanges({
    removed: () => {
      const usermame = rValidateUserName.get();
      if (usermame && password) {
        Meteor.loginWithPassword(usermame, password, resolveTask);
      }
    }
  });
});
Template.validateDialog.helpers({
  validateUserName() {
    return rValidateUserName.get();
  },
  validateBoard() {
    const configData = dbConfig.findOne();

    return configData ? configData.validateUserBoardName : '';
  },
  validateAID() {
    const configData = dbConfig.findOne();

    return configData ? configData.validateUserAID : '';
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
      if (! username || ! password) {
        window.alert('錯誤的帳號或密碼格式！');

        return false;
      }
      rValidateUserName.set(username);

      Meteor.call('loginOrRegister', username, password, (error, result) => {
        if (result === true) {
          Meteor.loginWithPassword(username, password, (error) => {
            if (error) {
              handleError(error);
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
