import { Meteor } from 'meteor/meteor';

import { roleDisplayName, banTypeDescription } from '/db/users';
import { createMetaProperty } from '/server/imports/metaTag/createMeta';

export function getAccountInfoMetaTag(userId) {
  const userData = userId ? getUserData(userId) : null;
  if (userData) {
    return createAccountInfoMetaTag(userData);
  }
  else {
    return null;
  }
}

function createAccountInfoMetaTag(userData) {
  let metaTag = '';
  const { websiteName, image } = Meteor.settings.public.websiteInfo;
  metaTag += createMetaProperty('og:site_name', websiteName);
  metaTag += createMetaProperty('og:image', image);
  metaTag += createMetaProperty('og:image:url', image);

  metaTag += createMetaProperty('og:title', `玩家 「${userData.profile.name}」`);
  metaTag += createMetaProperty('og:description', createAccountInfoDescription(userData));

  return metaTag;
}

function createAccountInfoDescription(userData) {
  let description = `${showValidateType(userData)} \n`;
  if (userData.profile.isInVacation) {
    description += '｜ 渡假中 ｜\n';
  }

  description += ' \n';
  description += createRolesText(userData.profile.roles);
  description += createBansText(userData.profile.ban);

  description += ' \n';
  description += `｜ 現金: ${userData.profile.money.toLocaleString()} \n`;
  description += `｜ 消費券: ${userData.profile.vouchers.toLocaleString()} \n`;
  description += `｜ 推薦票: ${userData.profile.voteTickets.toLocaleString()} \n`;

  return description;
}

function showValidateType(userData) {
  switch (userData.profile.validateType) {
    case 'Google': {
      return `【Google帳號】${userData.services.google.email}`;
    }
    case 'PTT': {
      return `【PTT帳號】${userData.username}`;
    }
    case 'Bahamut': {
      return `【巴哈姆特帳號】${userData.username.replace('?', '')}`;
    }
  }
}

function createRolesText(roles) {
  if (! roles || ! roles.length) {
    return '';
  }

  let text = roles.reduce((text, role) => {
    return `${text} ${roleDisplayName(role)} ｜`;
  }, '｜');
  text += ' \n';

  return text;
}

function createBansText(bans) {
  if (! bans || ! bans.length) {
    return '';
  }

  return bans.reduce((text, ban) => {
    return `${text}｜ 被禁止了${banTypeDescription(ban)} ｜\n`;
  }, '');
}

function getUserData(userId) {
  return Meteor.users.findOne({ _id: userId },
    {
      fileds: {
        'services.google.email': 1,
        username: 1,
        profile: 1
      }
    });
}
