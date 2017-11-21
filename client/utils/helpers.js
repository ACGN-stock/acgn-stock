'use strict';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbCompanies } from '../../db/dbCompanies';
import { dbVariables } from '../../db/dbVariables';

Meteor.subscribe('variables');

Template.registerHelper('getVariable', function(variableName) {
  return dbVariables.get(variableName);
});

export function currencyFormat(money) {
  switch (typeof money) {
    case 'string':
      return parseFloat(money).toLocaleString();
    case 'number':
      return money.toLocaleString();
    default:
      return money;
  }
}
Template.registerHelper('currencyFormat', currencyFormat);

export function getCompanyEPS(companyData) {
  return ((1 - (Meteor.settings.public.managerProfitPercent + Meteor.settings.public.costFromProfit + companyData.seasonalBonusPercent / 100)) *
    companyData.profit / companyData.totalRelease).toFixed(2);
}

export function getCompanyPERatio(companyData) {
  return (companyData.profit === 0) ? '∞' : (companyData.listPrice / getCompanyEPS(companyData)).toFixed(2);
}

export function getCompanyEPRatio(companyData) {
  return (getCompanyEPS(companyData) / companyData.listPrice).toFixed(2);
}

Template.registerHelper('getCompanyEPS', getCompanyEPS);
Template.registerHelper('getCompanyPERatio', getCompanyPERatio);
Template.registerHelper('getCompanyEPRatio', getCompanyEPRatio);

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

export function formatDateTimeText(date) {
  if (! date) {
    return '????/??/?? ??:??:??';
  }

  return (
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
Template.registerHelper('formatDateTimeText', formatDateTimeText);

export function formatTimeText(time) {
  const timeBase = 1000 * 60;

  if (! time) {
    return '??:??';
  }

  time = Math.floor(time / timeBase);

  return (
    padZero(Math.floor(time / 60)) +
    ':' +
    padZero(Math.floor(time % 60))
  );
}

export function currentUserId() {
  return Meteor.userId();
}
Template.registerHelper('currentUserId', currentUserId);

export function accountInfoLink(userId) {
  return FlowRouter.path('accountInfo', { userId });
}
Template.registerHelper('accountInfoLink', accountInfoLink);

export function isChairman(companyId) {
  const user = Meteor.user();
  if (user) {
    const companyData = dbCompanies.findOne(companyId);

    return user._id === companyData.chairman;
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

export function isFavorite(companyId) {
  const user = Meteor.user();
  if (! user || ! user.favorite) {
    return false;
  }

  return user.favorite.indexOf(companyId) >= 0;
}
Template.registerHelper('isFavorite', isFavorite);

Template.registerHelper('plus', function(value1, value2) {
  return value1 + value2;
});

Template.registerHelper('minus', function(value1, value2) {
  return value1 - value2;
});

Template.registerHelper('displayManager', function(manager) {
  return manager === '!none' ? '無' : manager;
});
