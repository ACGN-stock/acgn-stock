'use strict';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import config from '../../config.json';
import { handleError } from '../utils/handleError';

const validateUserName = new ReactiveVar('');
const validateCode = new ReactiveVar('');
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
  submit(event, templateInstance) {
    event.preventDefault();
    const username = templateInstance.$('#loginUserName').val();
    const password = templateInstance.$('#loginPassword').val();

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
});
