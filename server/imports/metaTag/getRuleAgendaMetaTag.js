import { Meteor } from 'meteor/meteor';

import { dbRuleAgendas } from '/db/dbRuleAgendas';
import { createMetaProperty } from '/server/imports/metaTag/createMeta';
import { removeMarkdown } from '/server/imports/metaTag/removeMarkdown';
import { formatDateTimeText, toCustomTimezone } from '/common/imports/utils/formatTimeUtils';

export function getRuleAgendaMetaTag(agendaId) {
  const agendaData = agendaId ? getAgendaData(agendaId) : null;
  if (agendaData) {
    return createAgendaMetaTag(agendaData);
  }
  else {
    return null;
  }
}

function createAgendaMetaTag(agendaData) {
  let metaTag = '';
  const { websiteName, image } = Meteor.settings.public.websiteInfo;
  metaTag += createMetaProperty('og:site_name', websiteName);
  metaTag += createMetaProperty('og:image', image);
  metaTag += createMetaProperty('og:image:url', image);

  const { title } = agendaData;
  metaTag += createMetaProperty('og:title', `議程 「${title}」`);
  metaTag += createMetaProperty('og:description', createAgendaDescription(agendaData));

  return metaTag;
}

function createAgendaDescription(agendaData) {
  return `｜ 投票結束時間: ${formatExpireDate(agendaData)} ｜

    ${removeMarkdown(agendaData.description)}
  `;
}

function formatExpireDate(agendaData) {
  const expireDate = new Date(agendaData.createdAt.getTime() + (agendaData.duration * 60 * 60 * 1000));

  return formatDateTimeText(toCustomTimezone(expireDate));
}

function getAgendaData(agendaId) {
  return dbRuleAgendas.findOne({ _id: agendaId },
    {
      fileds: {
        title: 1,
        description: 1,
        createdAt: 1,
        duration: 1
      }
    });
}
