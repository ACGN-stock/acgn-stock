'use strict';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { dbVariables } from '../../db/dbVariables';

Meteor.subscribe('variables');

Template.registerHelper('getVariable', function(variableName) {
  return dbVariables.get(variableName);
});

export function formatDateText(date) {
  if (! date) {
    return '????/??/?? ??:??:??';
  }

  return (
    date.getFullYear() +
    '/' +
    padZero(date.getMonth() + 1) +
    '/' +
    padZero(date.getDate()) +
    ' ' +
    padZero(date.getHours()) +
    ':' +
    padZero(date.getMinutes()) +
    ':' +
    padZero(date.getSeconds())
  );
}
function padZero(n) {
  if (n < 10) {
    return '0' + n;
  }
  else {
    return '' + n;
  }
}
Template.registerHelper('formatDateText', formatDateText);

export function getChairmanId(companyId) {
  return dbVariables.get('chairmanIdOf' + companyId);
}
Template.registerHelper('getChairmanId', getChairmanId);

export function isChairman(companyId) {
  const user = Meteor.user();
  if (user) {
    return user._id === dbVariables.get('chairmanIdOf' + companyId);
  }
  else {
    return false;
  }
}
Template.registerHelper('isChairman', isChairman);

export function isUserId(userId) {
  const user = Meteor.user();
  if (user) {
    return user._id === userId;
  }
  else {
    return false;
  }
}
Template.registerHelper('isUserId', isUserId);

Template.registerHelper('plus', function(value1, value2) {
  return value1 + value2;
});

Template.registerHelper('minus', function(value1, value2) {
  return value1 - value2;
});

Template.registerHelper('displayManager', function(manager) {
  return manager === '!none' ? '無' : manager;
});
