'use strict';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
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

export function getCompanyLinkHref(companyName) {
  return FlowRouter.path('company', {companyName});
}
Template.registerHelper('getCompanyLinkHref', getCompanyLinkHref);

export function getCompanyLink(companyName) {
  const href = getCompanyLinkHref(companyName);

  return '<a href="' + href + '">' + companyName + '</a>';
}
Template.registerHelper('getCompanyLink', getCompanyLink);

export function getCompanyProductLinkHref(companyName) {
  return FlowRouter.path('productCenterByCompany', {companyName});
}
Template.registerHelper('getCompanyProductLinkHref', getCompanyProductLinkHref);

export function getAccountInfoLinkHref(username) {
  return FlowRouter.path('accountInfo', {username});
}
Template.registerHelper('getCompanyProductLinkHref', getCompanyProductLinkHref);

export function getChainman(companyName) {
  return dbVariables.get('chairmanNameOf' + companyName);
}
Template.registerHelper('getChainman', getChainman);

export function isChairman(companyName) {
  const user = Meteor.user();
  if (user) {
    return user.username === dbVariables.get('chairmanNameOf' + companyName);
  }
  else {
    return false;
  }
}
Template.registerHelper('isChairman', isChairman);

Template.registerHelper('add', function(value1, value2) {
  return value1 + value2;
});
