import { Meteor } from 'meteor/meteor';

import { dbAnnouncements, announcementCategoryMap } from '/db/dbAnnouncements';
import { createMetaProperty } from '/server/imports/metaTag/createMeta';
import { removeMarkdown } from '/server/imports/metaTag/removeMarkdown';
import { formatDateTimeText, toCustomTimezone } from '/common/imports/utils/formatTimeUtils';

export function getAnnouncementMetaTag(announcementId) {
  const announcementData = announcementId ? getAnnouncementData(announcementId) : null;
  if (announcementData) {
    return createAnnouncementMetaTag(announcementData);
  }
  else {
    return null;
  }
}

function createAnnouncementMetaTag(announcementData) {
  let metaTag = '';
  const { websiteName, image } = Meteor.settings.public.websiteInfo;
  metaTag += createMetaProperty('og:site_name', websiteName);
  metaTag += createMetaProperty('og:image', image);
  metaTag += createMetaProperty('og:image:url', image);

  metaTag += createMetaProperty('og:title', createAnnouncementTitle(announcementData));
  metaTag += createMetaProperty('og:description', createAnnouncementDescription(announcementData));

  return metaTag;
}

function createAnnouncementTitle({ category, subject, voided }) {
  let title = '';

  if (voided) {
    title += `【已作廢】 `;
  }

  title += '公告';

  if (announcementCategoryMap[category]) {
    title += `(${announcementCategoryMap[category].displayName})`;
  }
  title += ` 「${subject}」`;

  return title;
}

function createAnnouncementDescription({ content, createdAt, voided, voidedAt }) {
  return `｜ 發佈時間: ${formatDateTimeText(toCustomTimezone(createdAt))} ${voided ? `\n｜ 作廢時間: ${formatDateTimeText(toCustomTimezone(voidedAt))}` : ''}

    ${removeMarkdown(content)}
  `;
}

function getAnnouncementData(announcementId) {
  return dbAnnouncements.findOne({ _id: announcementId },
    {
      fileds: {
        category: 1,
        subject: 1,
        content: 1,
        createdAt: 1,
        voided: 1,
        voidedAt: 1
      }
    });
}
