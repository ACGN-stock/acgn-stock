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
