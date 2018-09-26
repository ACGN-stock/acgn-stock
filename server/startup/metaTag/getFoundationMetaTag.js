import { Meteor } from 'meteor/meteor';

import { dbFoundations } from '/db/dbFoundations';
import { createMetaProperty } from '/server/startup/metaTag/createMeta';
import { removeMarkdown } from '/server/startup/metaTag/removeMarkdown';
import { formatShortDateTimeText } from '/common/imports/utils/formatTimeUtils';

export function getFoundationMetaTag(companyId) {
  const foundationData = companyId ? getFoundationData(companyId) : null;
  if (foundationData) {
    return createFoundationMetaTag(foundationData);
  }
  else {
    return null;
  }
}

function createFoundationMetaTag(foundationData) {
  let metaTag = '';
  metaTag += createMetaProperty('og:site_name', Meteor.settings.public.websiteInfo.websiteName);

  const { companyName, pictureSmall } = foundationData;
  metaTag += createMetaProperty('og:title', `(新創計劃) ${companyName}`);
  metaTag += createMetaProperty('og:image', pictureSmall);
  metaTag += createMetaProperty('og:image:url', pictureSmall);
  metaTag += createMetaProperty('og:description', createFoundationDescription(foundationData));

  return metaTag;
}

function createFoundationDescription({ createdAt, description }) {
  return `｜ 新創投資截止時間: ${getExpireDateText(createdAt)} ｜

    ${removeMarkdown(description)}
  `;
}

function getFoundationData(companyId) {
  return dbFoundations.findOne({ _id: companyId },
    {
      fileds: {
        companyName: 1,
        pictureSmall: 1,
        description: 1,
        createdAt: 1
      }
    });
}


// TODO 讓client與server用共通的function來format時間
function getExpireDateText(createdAt) {
  const expireDate = new Date(createdAt.getTime() + Meteor.settings.public.foundExpireTime);

  return formatShortDateTimeText(expireDate);
}
