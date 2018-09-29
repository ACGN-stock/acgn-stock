import showdown from 'showdown';
import xss from 'xss';
import footnotes from 'showdown-footnotes';
import katex from 'katex';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { dbCompanies } from '/db/dbCompanies';
import { dbDirectors } from '/db/dbDirectors';
import { dbEmployees } from '/db/dbEmployees';
import { dbVariables } from '/db/dbVariables';
import { stoneDisplayName } from '/db/dbCompanyStones';
import { hasRole, hasAnyRoles, hasAllRoles } from '/db/users';
import { formatDateTimeText, formatShortDateTimeText, formatShortDurationTimeText, formatLongDurationTimeText } from '/common/imports/utils/formatTimeUtils';

import '../layout/highcharts-themes';

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
  const {
    _id: companyId, manager, profit, totalRelease,
    managerBonusRatePercent, employeeBonusRatePercent, capitalIncreaseRatePercent
  } = companyData;

  const { incomeTaxRatePercent, employeeProductVotingRewardRatePercent } = Meteor.settings.public.companyProfitDistribution;

  const hasManager = manager !== '!none';
  const hasEmployees = dbEmployees.find({ companyId, employed: true }).count() > 0;

  const directorBonusRatePercent = 100 - [
    incomeTaxRatePercent,
    capitalIncreaseRatePercent,
    hasManager ? managerBonusRatePercent : 0,
    hasEmployees ? employeeBonusRatePercent : 0,
    hasEmployees ? employeeProductVotingRewardRatePercent : 0
  ].reduce((a, b) => {
    return a + b;
  }, 0);

  return (profit * directorBonusRatePercent / 100 / totalRelease).toFixed(2);
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


Template.registerHelper('formatDateTimeText', formatDateTimeText);
Template.registerHelper('formatShortDateTimeText', formatShortDateTimeText);
Template.registerHelper('formatShortDurationTimeText', formatShortDurationTimeText);
Template.registerHelper('formatLongDurationTimeText', formatLongDurationTimeText);

export function currentUserId() {
  return Meteor.userId();
}
Template.registerHelper('currentUserId', currentUserId);

export function accountInfoLink(userId) {
  return FlowRouter.path('accountInfo', { userId });
}
Template.registerHelper('accountInfoLink', accountInfoLink);

export function isCurrentUserDirectorOf(companyId) {
  const userId = Meteor.userId();

  if (! userId) {
    return false;
  }

  return !! dbDirectors.find({ userId, companyId }).count();
}
Template.registerHelper('isCurrentUserDirectorOf', isCurrentUserDirectorOf);

export function isCurrentUserChairmanOf(companyId) {
  const user = Meteor.user();
  if (user) {
    const companyData = dbCompanies.findOne(companyId);

    return companyData && user._id === companyData.chairman;
  }
  else {
    return false;
  }
}
Template.registerHelper('isCurrentUserChairmanOf', isCurrentUserChairmanOf);

export function isCurrentUser(userId) {
  const user = Meteor.user();
  if (user) {
    return user._id === userId;
  }
  else {
    return false;
  }
}
Template.registerHelper('isCurrentUser', isCurrentUser);

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

const katexExtension = {
  type: 'lang',
  filter: function(text) {
    // lang模式會將$轉換為¨D      \r\n轉換為 \n
    const outputKatexHTML = text.replace(/¨D¨D((.|\n)*?)¨D¨D/g, function(match, capture) {
      const text = capture.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/\n/g, '\r\n');
      let html = katex.renderToString(text);

      if (text.search('\n') !== -1) {
        html = `<br/>${html}`;
      }

      return html;
    });

    return outputKatexHTML;
  }
};

// 防止 xss 幫我們跳脫字元
function escapeHtml(html) {
  return html;
}

const whiteList = xss.getDefaultWhiteList();
whiteList.span.push('class');
whiteList.span.push('style');

const xssFilter = {
  type: 'output',
  filter: function(text) {
    return xss(text, { escapeHtml, whiteList, css: {
      whiteList: {
        'aria-hidden': true,
        'vertical-align': true,
        'top': true,
        'position': true,
        'height': true
      }
    } });
  }
};

const codeTagEscapedCharacterTranser = {
  type: 'lang',
  filter: function(text) {
    const output = text.replace(/```((.|\r|\n)*?)```/g, function(match, capture) {
      const text = capture.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&excl;/g, '!');

      return `\`\`\`${text}\`\`\``;
    });

    return output;
  }
};

export function markdown(content, { advanced = false } = {}) {
  if (! content) {
    return '';
  }

  const extensionsArray = [xssFilter, footnotes, codeTagEscapedCharacterTranser];
  let processedContent = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  if (advanced) {
    // 保留 KaTeX 和圖片
    extensionsArray.push(katexExtension);
  }
  else {
    processedContent = processedContent.replace(/!/g, '&excl;');
  }

  const converter = new showdown.Converter({ extensions: extensionsArray });
  converter.setFlavor('github');
  converter.setOption('openLinksInNewWindow', true);

  return converter.makeHtml(processedContent);
}
Template.registerHelper('markdown', function(content, kw = { hash: {} }) {
  return markdown(content, kw.hash);
});

export function toPercent(x) {
  return `${Math.round(x * 100)}%`;
}
Template.registerHelper('toPercent', toPercent);

export function currentUserHasRole(role) {
  return hasRole(Meteor.user(), role);
}
Template.registerHelper('currentUserHasRole', currentUserHasRole);

export function currentUserHasAnyRoles(...roles) {
  return hasAnyRoles(Meteor.user(), ...roles);
}
Template.registerHelper('currentUserHasAnyRoles', currentUserHasAnyRoles);

export function currentUserHasAllRoles(...roles) {
  return hasAllRoles(Meteor.user(), ...roles);
}
Template.registerHelper('currentUserHasAllRoles', currentUserHasAllRoles);

export function pathFor(pathDef, kw = { hash: {} }) {
  const { params, queryParams } = kw;

  return FlowRouter.path(pathDef, params, queryParams);
}
Template.registerHelper('pathFor', pathFor);

function simpleValidateTypeText(validateType) {
  switch (validateType) {
    case 'PTT': return 'PTT';
    case 'Bahamut': return '巴哈';
    case 'Google': return 'G帳';
    default: return '？';
  }
}

export function styledValidateTypeMarkHtml(validateType) {
  return `<span class="user-validate-type-mark">⟨${simpleValidateTypeText(validateType)}⟩</span>`;
}
Template.registerHelper('styledValidateTypeMarkHtml', styledValidateTypeMarkHtml);

function isRestrictedRating(rating) {
  return rating === '18禁';
}
Template.registerHelper('isRestrictedRating', isRestrictedRating);
