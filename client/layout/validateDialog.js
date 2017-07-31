'use strict';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { config } from '../../config';
import { handleError } from '../utils/handleError';

export const rShowLoginDialog = new ReactiveVar(false);
const validateUserName = new ReactiveVar('');
const validateCode = new ReactiveVar('');
let password = '';
Template.validateDialog.helpers({
  validateUserName() {
    return validateUserName.get();
  },
  validateBoard() {
    return config.validateBoard;
  },
  validateAID() {
    return config.validateAID;
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
