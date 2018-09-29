import { Meteor } from 'meteor/meteor';

import { dbViolationCases, stateMap, categoryMap } from '/db/dbViolationCases';
import { createMetaProperty } from '/server/imports/metaTag/createMeta';
import { removeMarkdown } from '/server/imports/metaTag/removeMarkdown';
import { formatDateTimeText, toCustomTimezone } from '/common/imports/utils/formatTimeUtils';

export function getViolationCaseMetaTag(violationCaseId) {
  const violationCase = violationCaseId ? getViolationCase(violationCaseId) : null;
  if (violationCase) {
    return createViolationCaseMetaTag(violationCase);
  }
  else {
    return null;
  }
}

function createViolationCaseMetaTag(violationCase) {
  let metaTag = '';
  const { websiteName, image } = Meteor.settings.public.websiteInfo;
  metaTag += createMetaProperty('og:site_name', websiteName);
  metaTag += createMetaProperty('og:image', image);
  metaTag += createMetaProperty('og:image:url', image);

  metaTag += createMetaProperty('og:title', createViolationCaseTitle(violationCase));
  metaTag += createMetaProperty('og:description', createViolationCaseDescription(violationCase));

  return metaTag;
}

function createViolationCaseTitle({ state, category }) {
  let title = '';

  if (stateMap[state]) {
    title += `【${stateMap[state].displayName}】 `;
  }

  title += '股市違規案件';

  if (categoryMap[category]) {
    title += ` ─ ${categoryMap[category].displayName}`;
  }

  return title;
}

function createViolationCaseDescription({ description, createdAt, updatedAt }) {
  return `｜ 舉報時間: ${formatDateTimeText(toCustomTimezone(createdAt))} \n｜ 更新時間: ${formatDateTimeText(toCustomTimezone(updatedAt))}

    ${removeMarkdown(description)}
  `;
}

function getViolationCase(violationCaseId) {
  return dbViolationCases.findOne({ _id: violationCaseId },
    {
      fileds: {
        state: 1,
        category: 1,
        description: 1,
        createdAt: 1,
        updatedAt: 1
      }
    });
}
