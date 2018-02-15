'use strict';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { $ } from 'meteor/jquery';

import { dbCompanies } from '/db/dbCompanies';
import { dbEmployees } from '/db/dbEmployees';
import { dbVariables } from '/db/dbVariables';
import { stoneDisplayName } from '/db/dbCompanyStones';
import '../layout/highcharts-themes';


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
  let multiplier = 1;

  multiplier -= (companyData.manager !== '!none') ? Meteor.settings.public.managerProfitPercent : 0;
  multiplier -= (dbEmployees.find({
    companyId: companyData._id,
    employed: true
  }).count() > 0) ? (companyData.seasonalBonusPercent / 100) : 0;
  multiplier -= Meteor.settings.public.costFromProfit;

  return (companyData.profit * multiplier / companyData.totalRelease).toFixed(2);
}

export function getCompanyPERatio(companyData) {
  const eps = parseFloat(getCompanyEPS(companyData));

  return (eps === 0) ? '∞' : (companyData.listPrice / eps).toFixed(2);
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
    `${date.getFullYear()}/${padZero(date.getMonth() + 1)}/${padZero(date.getDate())} ${padZero(date.getHours())}:${padZero(date.getMinutes())}:${padZero(date.getSeconds())}`
  );
}
function padZero(n) {
  if (n < 10) {
    return `0${n}`;
  }
  else {
    return `${n}`;
  }
}
Template.registerHelper('formatDateText', formatDateText);

export function formatDateTimeText(date) {
  if (! date) {
    return '????/??/?? ??:??:??';
  }

  return (
    `${padZero(date.getMonth() + 1)}/${padZero(date.getDate())} ${padZero(date.getHours())}:${padZero(date.getMinutes())}:${padZero(date.getSeconds())}`
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
    `${padZero(Math.floor(time / 60))}:${padZero(time % 60)}`
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

    return companyData && user._id === companyData.chairman;
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

export function sanitizeHtml(str) {
  return $('<span></span>')
    .text(str)
    .html();
}
Template.registerHelper('sanitizeHtml', sanitizeHtml);

export { stoneDisplayName };
Template.registerHelper('stoneDisplayName', stoneDisplayName);

export function stoneIconPath(stoneType) {
  switch (stoneType) {
    case 'saint':
      return '/stone-saint.png';
    case 'birth':
      return '/stone-birth.png';
    case 'quest':
      return '/stone-quest.png';
    case 'rainbow':
      return '/stone-rainbow.png';
    case 'rainbowFragment':
      return '/stone-rainbow-fragment.png';
    default:
      return '';
  }
}
Template.registerHelper('stoneIconPath', stoneIconPath);

export function setChartTheme(name) {
  if (Highcharts.theme[name]) {
    const themeOptions = Highcharts.theme[name];
    const defaultOptions = Highcharts.getOptions();

    for (const prop in defaultOptions) {
      if (typeof defaultOptions[prop] !== 'function') {
        delete defaultOptions[prop];
      }
    }

    Highcharts.setOptions(Highcharts.theme.default);
    Highcharts.setOptions(themeOptions);
    Highcharts.setOptions({
      global: {
        useUTC: false,
        timezoneOffset: new Date().getTimezoneOffset()
      }
    });
  }
}
Template.registerHelper('setChartTheme', setChartTheme);
export function productCenterByCompanyPath(companyId) {
  return FlowRouter.path('productCenterByCompany', { companyId });
}
Template.registerHelper('productCenterByCompanyPath', productCenterByCompanyPath);

export function isCompanyManager(kwargs) {
  const { company, user } = kwargs.hash;

  if (! company || ! user) {
    return false;
  }

  if (typeof company === 'string') {
    return isCompanyManager({ hash: { company: dbCompanies.findOne(company), user } });
  }

  if (typeof user === 'string') {
    return isCompanyManager({ hash: { company, user: Meteor.users.findOne(user) } });
  }

  return company.manager === user._id;
}
Template.registerHelper('isCompanyManager', isCompanyManager);

Template.registerHelper('round', Math.round);

export function markdown(content) {
  const showdown = require('showdown');
  const xssFilter = require('showdown-xss-filter');
  const converter = new showdown.Converter({ extensions: [xssFilter] });
  converter.setFlavor('github');
  const pureContent = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  return converter.makeHtml(pureContent);
}
Template.registerHelper('markdown', markdown);