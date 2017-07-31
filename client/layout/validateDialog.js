'use strict';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { handleError } from '../utils/handleError';
import { dbConfig } from '../../db/dbConfig';

export const rShowLoginDialog = new ReactiveVar(false);
const validateUserName = new ReactiveVar('');
const validateCode = new ReactiveVar('');
let password = '';

Template.validateDialog.onCreated(function() {
  this.subscribe('dbConfig');
});
Template.validateDialog.helpers({
  validateUserName() {
    return validateUserName.get();
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
    return validateCode.get();
  }
});
Template.validateDialog.events({
  reset() {
    validateUserName.set('');
    validateCode.set('');
    rShowLoginDialog.set(false);
  },
  submit(event, templateInstance) {
    event.preventDefault();
    if (validateCode.get()) {
      Meteor.call('validateAccount', validateUserName.get(), (error) => {
        if (error) {
          handleError(error);
        }
        Meteor.loginWithPassword(validateUserName.get(), password, (error) => {
          if (error) {
            handleError(error);
          }
        });
      });
    }
    else {
      const username = templateInstance.$('#loginUserName').val();
      password = templateInstance.$('#loginPassword').val();
      if (! username || ! password) {
        window.alert('錯誤的帳號或密碼格式！');

        return false;
      }

      Meteor.call('loginOrRegister', username, password, (error, result) => {
        if (error) {
          handleError(error);
        }
        else if (result === true) {
          Meteor.loginWithPassword(username, password, (error) => {
            if (error) {
              handleError(error);
            }
          });
        }
        else {
          validateUserName.set(username);
          validateCode.set(result);
        }
      });
    }
  }
});
